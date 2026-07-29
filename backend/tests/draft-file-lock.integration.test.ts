import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { captureReviewSnapshot } from "../src/modules/drafting/review-snapshot.service.js";
import { deleteFileAsset } from "../src/modules/files/file.service.js";
import { registerUploadedFileAsset } from "../src/modules/files/file-registration.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const UPLOAD_CONSTRAINTS = {
  allowedMimeTypes: ["application/pdf"] as [string, ...string[]],
  maxAttachmentsPerDraft: 5,
  maxFileBytes: 10_000_000,
  maxTotalBytes: 20_000_000,
};

/**
 * The user story under test:
 *
 *   A customer hits "send to review" and, in the same second, removes an
 *   enclosure from the other tab. What Swiss Post prints comes from the
 *   snapshot taken at review, so the two must not both succeed: an app that
 *   reports the document as removed while the envelope still contains it is a
 *   discrepancy nobody can explain to the recipient afterwards.
 *
 * Both paths now take `draft_letters FOR UPDATE` before they read the status
 * they act on, which only a real Postgres can demonstrate — a mocked db has no
 * lock queue and no notion of one transaction waiting for another.
 */
describeIfIntegrationDb("draft row lock: review versus file mutation", () => {
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

  /** A connection of its own, so two requests can actually contend. */
  async function openConnection(): Promise<{ client: pg.Client; db: IntegrationDb }> {
    const client = new pg.Client({ connectionString: integrationDatabaseUrl ?? "" });
    await client.connect();
    await client.query(`SET search_path TO "${schemaName}"`);
    openClients.push(client);
    return { client, db: drizzle(client) as unknown as IntegrationDb };
  }

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  async function backendPid(client: pg.Client): Promise<number> {
    const result = await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
    const row = result.rows[0];
    if (!row) throw new Error("Expected a backend pid");
    return row.pid;
  }

  /**
   * Wait until this connection is queued behind someone else's row lock.
   *
   * This is what pins the interleaving the bug needed: without it the test only
   * proves that two operations run in some order, which the sequential case
   * already does.
   */
  async function waitUntilBlocked(observer: pg.Client, pid: number): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt++) {
      const result = await observer.query<{ blocked: string }>(
        "SELECT count(*)::text AS blocked FROM pg_locks WHERE pid = $1 AND NOT granted",
        [pid],
      );
      if (Number(result.rows[0]?.blocked ?? 0) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Backend ${pid} never blocked on a lock`);
  }

  let unique = 0;

  interface Fixture {
    sessionId: string;
    draftId: string;
    fileId: string;
  }

  async function createFixture(db: IntegrationDb): Promise<Fixture> {
    unique += 1;
    const sessionId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
        VALUES (${`lock-${unique}-${Date.now()}`}, NOW() + interval '3 days', NOW() + interval '3 days')
        RETURNING id
      `),
    ).id;

    const senderId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sender_profiles (session_id, first_name, last_name, address_line_1, postal_code, city, country)
        VALUES (${sessionId}, 'Anna', 'Muster', 'Bahnhofstrasse 1', '3011', 'Bern', 'CH')
        RETURNING id
      `),
    ).id;

    const recipientId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO recipient_profiles (session_id, company, address_line_1, postal_code, city, country)
        VALUES (${sessionId}, 'Swisscom AG', 'Alte Tiefenaustrasse 6', '3050', 'Bern', 'CH')
        RETURNING id
      `),
    ).id;

    const draftId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters
          (session_id, locale, status, subject, body, sender_profile_id, recipient_profile_id)
        VALUES (
          ${sessionId}, 'de-CH', 'fields_complete', 'Kündigung',
          'Sehr geehrte Damen und Herren, hiermit kündige ich.',
          ${senderId}, ${recipientId}
        )
        RETURNING id
      `),
    ).id;

    const fileId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO file_assets
          (session_id, draft_id, kind, storage_key, original_filename, mime_type, size_bytes, status)
        VALUES (
          ${sessionId}, ${draftId}, 'attachment', ${`attachments/${sessionId}/contract-${unique}`},
          'contract.pdf', 'application/pdf', 1024, 'active'
        )
        RETURNING id
      `),
    ).id;

    return { sessionId, draftId, fileId };
  }

  async function attachmentIdsInLatestSnapshot(
    db: IntegrationDb,
    draftId: string,
  ): Promise<string[]> {
    const rows = await db.execute<{ ids: string[] | null }>(sql`
      SELECT ARRAY(
        SELECT jsonb_array_elements_text(snapshot_data->'attachmentAssetIds')
      ) AS ids
      FROM draft_snapshots
      WHERE draft_id = ${draftId}
      ORDER BY version DESC
      LIMIT 1
    `);
    return firstRow(rows).ids ?? [];
  }

  async function statusOf(db: IntegrationDb, draftId: string): Promise<string> {
    const rows = await db.execute<{ status: string }>(sql`
      SELECT status FROM draft_letters WHERE id = ${draftId}
    `);
    return firstRow(rows).status;
  }

  async function fileStatus(db: IntegrationDb, fileId: string): Promise<string> {
    const rows = await db.execute<{ status: string }>(sql`
      SELECT status FROM file_assets WHERE id = ${fileId}
    `);
    return firstRow(rows).status;
  }

  /**
   * The exact interleaving the bug needed: the delete arrives *after* review has
   * read the file list and *before* review has advanced the draft.
   *
   * Review is stopped inside its transaction by an exclusive lock on
   * `draft_snapshots`, which it needs for the insert that comes after the file
   * read. At that moment the draft still says `fields_complete`, so a delete
   * that only read the status would be told the letter is editable, retire the
   * enclosure, and leave the snapshot — the thing Swiss Post prints from —
   * listing a document the app reports as deleted. It blocks instead, because
   * review is holding the draft row.
   */
  it("a delete arriving inside review's window blocks, and the enclosure stays in the envelope", async () => {
    const db = await setup();
    const fixture = await createFixture(db);

    const holder = await openConnection();
    const reviewer = await openConnection();
    const deleter = await openConnection();
    const observer = await openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE draft_snapshots IN EXCLUSIVE MODE");

    // Review gets as far as the snapshot insert: past the file read, still
    // holding the draft row, with the draft not yet advanced.
    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await waitUntilBlocked(observer.client, await backendPid(reviewer.client));
    expect(await statusOf(db, fixture.draftId)).toBe("fields_complete");

    const remove = deleteFileAsset(deleter.db, fixture.fileId, fixture.sessionId).then(
      () => "deleted" as const,
      (error: unknown) => error,
    );
    await waitUntilBlocked(observer.client, await backendPid(deleter.client));

    await holder.client.query("COMMIT");

    const snapshot = await review;
    const removeOutcome = await remove;

    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
    expect(await attachmentIdsInLatestSnapshot(db, fixture.draftId)).toEqual([
      fixture.fileId,
    ]);

    // The delete has to lose: the letter it would change is already frozen.
    expect(removeOutcome).toBeInstanceOf(Error);
    expect((removeOutcome as Error).message).toMatch(
      /Draft files cannot be changed in status 'rendering'/,
    );
    expect(await fileStatus(db, fixture.fileId)).toBe("active");
    expect(await statusOf(db, fixture.draftId)).toBe("rendering");
  });

  /** The other consistent outcome: the delete wins and review never sees it. */
  it("a delete that wins the race leaves the enclosure out of the snapshot", async () => {
    const db = await setup();
    const fixture = await createFixture(db);

    const holder = await openConnection();
    const reviewer = await openConnection();
    const deleter = await openConnection();
    const observer = await openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("SELECT id FROM draft_letters WHERE id = $1 FOR UPDATE", [
      fixture.draftId,
    ]);

    const remove = deleteFileAsset(deleter.db, fixture.fileId, fixture.sessionId);
    await waitUntilBlocked(observer.client, await backendPid(deleter.client));

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await waitUntilBlocked(observer.client, await backendPid(reviewer.client));

    await holder.client.query("COMMIT");

    await remove;
    const snapshot = await review;

    expect(snapshot.attachmentFileIds).toEqual([]);
    expect(await attachmentIdsInLatestSnapshot(db, fixture.draftId)).toEqual([]);
    expect(await fileStatus(db, fixture.fileId)).toBe("pending_deletion");
  });

  /** Uploads are the same race with the opposite sign: a late enclosure. */
  it("an upload racing review is refused rather than landing after the snapshot", async () => {
    const db = await setup();
    const fixture = await createFixture(db);

    const holder = await openConnection();
    const reviewer = await openConnection();
    const uploader = await openConnection();
    const observer = await openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE draft_snapshots IN EXCLUSIVE MODE");

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await waitUntilBlocked(observer.client, await backendPid(reviewer.client));

    const upload = registerUploadedFileAsset(uploader.db, {
      draftId: fixture.draftId,
      sessionId: fixture.sessionId,
      kind: "attachment",
      sizeBytes: 2048,
      constraints: UPLOAD_CONSTRAINTS,
      storageKey: `attachments/${fixture.sessionId}/late-${Date.now()}`,
      originalFilename: "late.pdf",
      mimeType: "application/pdf",
    }).then(
      () => "registered" as const,
      (error: unknown) => error,
    );
    await waitUntilBlocked(observer.client, await backendPid(uploader.client));

    await holder.client.query("COMMIT");

    const snapshot = await review;
    const uploadOutcome = await upload;

    expect(uploadOutcome).toBeInstanceOf(Error);
    expect((uploadOutcome as Error).message).toMatch(
      /Draft files cannot be changed in status 'rendering'/,
    );

    // And nothing was inserted: the snapshot's file list is still the whole
    // truth about what goes in the envelope.
    const rows = await db.execute<{ total: string }>(sql`
      SELECT count(*)::text AS total FROM file_assets WHERE draft_id = ${fixture.draftId}
    `);
    expect(firstRow(rows).total).toBe("1");
    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
  });
});
