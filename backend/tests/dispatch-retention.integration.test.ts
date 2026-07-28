import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import pg from "pg";

import {
  retireDraftAssets,
  retireDraftlessAssets,
} from "../src/workers/asset-retention.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

/**
 * The user story under test:
 *
 *   A user paid for a registered letter with a PDF enclosure. The first
 *   dispatch attempt was rejected by the provider weeks ago and a retry is
 *   queued now. The retention sweep runs at the same instant. The letter must
 *   not go to Swiss Post without the enclosure, and the enclosure must not be
 *   retired out from under the queued retry.
 *
 * Half the guarantee is row-level locking and READ COMMITTED snapshot timing,
 * so this can only be tested against a real Postgres with two connections.
 */
describeIfIntegrationDb("dispatch/retention serialisation", () => {
  let cleanup: (() => Promise<void>) | null = null;
  let schemaName = "";
  const openClients: pg.Client[] = [];

  afterEach(async () => {
    for (const client of openClients.splice(0)) {
      await client.end().catch(() => undefined);
    }
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function setup(): Promise<IntegrationDb> {
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    schemaName = ctx.schemaName;
    return ctx.db;
  }

  async function secondConnection(): Promise<pg.Client> {
    const client = new pg.Client({ connectionString: integrationDatabaseUrl ?? "" });
    await client.connect();
    await client.query(`SET search_path TO "${schemaName}"`);
    openClients.push(client);
    return client;
  }

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  let unique = 0;

  interface Fixture {
    sessionId: string;
    draftId: string;
    snapshotId: string;
    attachmentId: string;
  }

  /**
   * A dispatched letter with one attachment, old enough for every age-based
   * retention step to want it.
   */
  async function createDispatchedDraft(
    db: IntegrationDb,
    options: { sessionExpired?: boolean } = {},
  ): Promise<Fixture> {
    unique += 1;
    const expiry = options.sessionExpired
      ? sql`NOW() - interval '1 day'`
      : sql`NOW() + interval '3 days'`;
    const sessionId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
        VALUES (${`hash-${unique}-${Date.now()}`}, NOW() + interval '3 days', ${expiry})
        RETURNING id
      `),
    ).id;

    const draftId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters (session_id, status, locale)
        VALUES (${sessionId}, 'dispatched', 'de-CH')
        RETURNING id
      `),
    ).id;

    const snapshotId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_snapshots (draft_id, version, snapshot_data)
        VALUES (${draftId}, 1, '{"schemaVersion":1}'::jsonb)
        RETURNING id
      `),
    ).id;

    const attachmentId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO file_assets
          (session_id, draft_id, kind, storage_key, mime_type, size_bytes, status,
           extracted_text, created_at)
        VALUES (${sessionId}, ${draftId}, 'attachment', ${`att/${unique}-${Date.now()}`},
                'application/pdf', 1024, 'active', 'contract text',
                NOW() - interval '400 days')
        RETURNING id
      `),
    ).id;

    // An attempt that went out long ago — what every dispatch-driven retention
    // step keys off.
    await db.execute(sql`
      INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name, submitted_at)
      VALUES (${draftId}, ${snapshotId}, 'submitted', 'test', NOW() - interval '400 days')
    `);

    return { sessionId, draftId, snapshotId, attachmentId };
  }

  async function queueRetry(db: IntegrationDb, fixture: Fixture): Promise<void> {
    await db.execute(sql`
      INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name)
      VALUES (${fixture.draftId}, ${fixture.snapshotId}, 'queued', 'test')
    `);
  }

  async function statusOf(db: IntegrationDb, assetId: string): Promise<string> {
    return firstRow(
      await db.execute<{ status: string }>(
        sql`SELECT status FROM file_assets WHERE id = ${assetId}`,
      ),
    ).status;
  }

  /** The step-6 candidate: attachments of a letter dispatched long ago. */
  const dispatchedAttachment = sql`
    fa.kind IN ('attachment', 'signature')
    AND fa.status = 'active'
    AND EXISTS (
      SELECT 1 FROM dispatch_attempts da
      WHERE da.draft_id = fa.draft_id
        AND da.submitted_at IS NOT NULL
        AND da.submitted_at < NOW() - interval '1 hour'
    )`;

  /** The step-7 candidate: age alone, no dispatch predicate at all. */
  const staleContent = sql`
    fa.status = 'active'
    AND fa.kind NOT IN ('rendered_pdf', 'signed_pdf')
    AND fa.created_at < NOW() - interval '30 days'`;

  it("retires a dispatched attachment when nothing is queued", async () => {
    const db = await setup();
    const fixture = await createDispatchedDraft(db);

    const result = await retireDraftAssets(db, 100, dispatchedAttachment);

    expect(result.assetIds).toEqual([fixture.attachmentId]);
    expect(result.deferredDrafts).toBe(0);
    expect(await statusOf(db, fixture.attachmentId)).toBe("pending_deletion");
  });

  it("keeps the attachment a queued retry still needs", async () => {
    const db = await setup();
    const fixture = await createDispatchedDraft(db);
    await queueRetry(db, fixture);

    const result = await retireDraftAssets(db, 100, dispatchedAttachment);

    expect(result.assetIds).toEqual([]);
    expect(await statusOf(db, fixture.attachmentId)).toBe("active");
  });

  it("keeps it under the age-only backstop too", async () => {
    // Step 7 had no dispatch predicate at all, which made it the widest path
    // by which a queued retry could lose its enclosure — an old letter going
    // out on a retry is exactly what it matches.
    const db = await setup();
    const fixture = await createDispatchedDraft(db);
    await queueRetry(db, fixture);

    const result = await retireDraftAssets(db, 100, staleContent);

    expect(result.assetIds).toEqual([]);
    expect(await statusOf(db, fixture.attachmentId)).toBe("active");
  });

  it("keeps it when the session expired but a retry is queued", async () => {
    // Session expiry says nothing about dispatch: a paid letter whose retry is
    // still queued sits on a session that expires on schedule like any other.
    const db = await setup();
    const fixture = await createDispatchedDraft(db, { sessionExpired: true });
    await queueRetry(db, fixture);

    const expiredCandidate = sql`
      fa.status = 'active'
      AND EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = fa.session_id AND s.expires_at < NOW()
      )`;
    const result = await retireDraftAssets(db, 100, expiredCandidate);

    expect(result.assetIds).toEqual([]);
    expect(await statusOf(db, fixture.attachmentId)).toBe("active");
  });

  it("defers a draft whose lock a dispatch is holding", async () => {
    // Dispatch-first ordering. The submit worker holds `FOR SHARE` on the
    // draft while it creates the attempt and assembles the package; the sweep
    // must not push past that. `SKIP LOCKED` means it does not even wait.
    const db = await setup();
    const fixture = await createDispatchedDraft(db);

    const dispatcher = await secondConnection();
    await dispatcher.query("BEGIN");
    await dispatcher.query(`SELECT id FROM draft_letters WHERE id = $1 FOR SHARE`, [
      fixture.draftId,
    ]);
    await dispatcher.query(
      `INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name)
       VALUES ($1, $2, 'queued', 'test')`,
      [fixture.draftId, fixture.snapshotId],
    );

    const result = await retireDraftAssets(db, 100, dispatchedAttachment);

    expect(result.assetIds).toEqual([]);
    expect(result.deferredDrafts).toBe(1);
    expect(await statusOf(db, fixture.attachmentId)).toBe("active");

    await dispatcher.query("COMMIT");
  });

  it("declines the deferred draft on the next run, once the lock is free", async () => {
    // A deferred draft is not lost, and it is not silently retired later
    // either: the next run takes the lock, and because the retirement is a
    // separate command from the lock, its guard runs on a snapshot that
    // includes everything the lock holder committed.
    const db = await setup();
    const fixture = await createDispatchedDraft(db);

    const dispatcher = await secondConnection();
    await dispatcher.query("BEGIN");
    await dispatcher.query(`SELECT id FROM draft_letters WHERE id = $1 FOR SHARE`, [
      fixture.draftId,
    ]);
    await dispatcher.query(
      `INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name)
       VALUES ($1, $2, 'queued', 'test')`,
      [fixture.draftId, fixture.snapshotId],
    );

    const deferred = await retireDraftAssets(db, 100, dispatchedAttachment);
    expect(deferred.deferredDrafts).toBe(1);

    await dispatcher.query("COMMIT");

    const next = await retireDraftAssets(db, 100, dispatchedAttachment);
    expect(next.deferredDrafts).toBe(0);
    expect(next.assetIds).toEqual([]);
    expect(await statusOf(db, fixture.attachmentId)).toBe("active");
  });

  it("collects assets that belong to no draft", async () => {
    // A signature can be uploaded before the draft exists, so the draft-scoped
    // query above cannot see it — and nothing else would ever collect it.
    const db = await setup();
    unique += 1;
    const sessionId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
        VALUES (${`hash-${unique}-${Date.now()}`}, NOW() + interval '3 days', NOW() - interval '1 day')
        RETURNING id
      `),
    ).id;
    const assetId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO file_assets
          (session_id, kind, storage_key, mime_type, size_bytes, status, created_at)
        VALUES (${sessionId}, 'signature', ${`sig/${unique}-${Date.now()}`},
                'image/png', 512, 'active', NOW() - interval '400 days')
        RETURNING id
      `),
    ).id;

    const draftScoped = await retireDraftAssets(db, 100, staleContent);
    expect(draftScoped.assetIds).toEqual([]);

    const draftless = await retireDraftlessAssets(db, 100, staleContent);
    expect(draftless).toEqual([assetId]);
    expect(await statusOf(db, assetId)).toBe("pending_deletion");
  });
});
