import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import {
  DISPATCH_CLAIM_TTL_MINUTES,
  claimDispatchAttempt,
  findStuckDispatchAttempts,
  markDispatchSubmissionStarted,
  releaseDispatchClaim,
} from "../src/modules/dispatch/dispatch.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

/**
 * The user story under test:
 *
 *   A user paid for one registered letter. The submit job stalled — the worker
 *   was still waiting on Swiss Post when BullMQ handed the job to a second
 *   worker. The letter must be posted once, and the user must be charged for
 *   one letter, not two.
 *
 * The lease is a conditional UPDATE against real Postgres, so it can only be
 * tested here.
 */
describeIfIntegrationDb("dispatch submission lease", () => {
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

  /** A second connection, so two workers can contend for the same row. */
  async function secondDb(): Promise<IntegrationDb> {
    const client = new pg.Client({ connectionString: integrationDatabaseUrl ?? "" });
    await client.connect();
    await client.query(`SET search_path TO "${schemaName}"`);
    openClients.push(client);
    return drizzle(client) as unknown as IntegrationDb;
  }

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  let unique = 0;

  /** A queued attempt, exactly as the submit worker creates one. */
  async function createQueuedAttempt(db: IntegrationDb): Promise<string> {
    unique += 1;
    const sessionId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
        VALUES (${`claim-${unique}-${Date.now()}`}, NOW() + interval '3 days',
                NOW() + interval '3 days')
        RETURNING id
      `),
    ).id;

    const draftId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters (session_id, status, locale)
        VALUES (${sessionId}, 'ready', 'de-CH')
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

    return firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name)
        VALUES (${draftId}, ${snapshotId}, 'queued', 'test')
        RETURNING id
      `),
    ).id;
  }

  async function backdateClaim(
    db: IntegrationDb,
    attemptId: string,
    minutes: number,
  ): Promise<void> {
    await db.execute(sql`
      UPDATE dispatch_attempts
      SET claimed_at = NOW() - make_interval(mins => ${minutes})
      WHERE id = ${attemptId}
    `);
  }

  it("lets the first worker take the lease", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
  });

  it("turns away a second worker while the lease is live", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
    expect(await claimDispatchAttempt(db, attemptId)).toBeNull();
  });

  it("lets another worker take over once the lease has expired", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
    await backdateClaim(db, attemptId, DISPATCH_CLAIM_TTL_MINUTES + 1);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
  });

  it("keeps the lease held right up to the TTL", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
    await backdateClaim(db, attemptId, DISPATCH_CLAIM_TTL_MINUTES - 1);

    expect(await claimDispatchAttempt(db, attemptId)).toBeNull();
  });

  it("hands the lease straight back when a worker releases it", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    const token = await claimDispatchAttempt(db, attemptId);
    expect(token).not.toBeNull();
    await releaseDispatchClaim(db, attemptId, token as string);

    expect(await claimDispatchAttempt(db, attemptId)).toEqual(expect.any(String));
  });

  it("refuses an attempt that has already been submitted", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);
    await db.execute(sql`
      UPDATE dispatch_attempts
      SET state = 'submitted', submitted_at = NOW()
      WHERE id = ${attemptId}
    `);

    expect(await claimDispatchAttempt(db, attemptId)).toBeNull();
  });

  it("never lets anyone claim an attempt that already reached the provider", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    const token = await claimDispatchAttempt(db, attemptId);
    expect(await markDispatchSubmissionStarted(db, attemptId, token as string)).toBe(
      true,
    );

    // Even with the lease long expired: we cannot tell a letter Swiss Post never
    // received from one it already has, so nobody may send it again.
    await backdateClaim(db, attemptId, DISPATCH_CLAIM_TTL_MINUTES * 10);
    expect(await claimDispatchAttempt(db, attemptId)).toBeNull();
  });

  it("refuses to start submission on a lease someone else has taken", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    const staleToken = await claimDispatchAttempt(db, attemptId);
    await backdateClaim(db, attemptId, DISPATCH_CLAIM_TTL_MINUTES + 1);
    const newToken = await claimDispatchAttempt(db, attemptId);
    expect(newToken).not.toBeNull();

    expect(await markDispatchSubmissionStarted(db, attemptId, staleToken as string)).toBe(
      false,
    );
    expect(await markDispatchSubmissionStarted(db, attemptId, newToken as string)).toBe(
      true,
    );
  });

  it("does not let a stale worker release the current holder's lease", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    const staleToken = await claimDispatchAttempt(db, attemptId);
    await backdateClaim(db, attemptId, DISPATCH_CLAIM_TTL_MINUTES + 1);
    expect(await claimDispatchAttempt(db, attemptId)).not.toBeNull();

    await releaseDispatchClaim(db, attemptId, staleToken as string);

    // The new holder still owns it: the stale release was a no-op.
    expect(await claimDispatchAttempt(db, attemptId)).toBeNull();
  });

  it("reports an abandoned attempt, and says whether the provider was reached", async () => {
    const db = await setup();
    const untouched = await createQueuedAttempt(db);
    const submitting = await createQueuedAttempt(db);

    const token = await claimDispatchAttempt(db, submitting);
    await markDispatchSubmissionStarted(db, submitting, token as string);

    // Both are old enough to be abandoned and nobody holds a live lease.
    await db.execute(sql`
      UPDATE dispatch_attempts
      SET created_at = NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES * 2}),
          claimed_at = NULL
    `);

    const stuck = await findStuckDispatchAttempts(db, 10);
    const byId = new Map(stuck.map((row) => [row.id, row]));

    expect(byId.get(untouched)?.submissionStarted).toBe(false);
    expect(byId.get(submitting)?.submissionStarted).toBe(true);
  });

  it("leaves a freshly queued attempt alone", async () => {
    const db = await setup();
    await createQueuedAttempt(db);

    // The submit job is still on its way; this is not abandoned.
    expect(await findStuckDispatchAttempts(db, 10)).toEqual([]);
  });

  it("leaves an attempt whose lease is still live alone", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);
    await claimDispatchAttempt(db, attemptId);
    await db.execute(sql`
      UPDATE dispatch_attempts
      SET created_at = NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES * 2})
    `);

    expect(await findStuckDispatchAttempts(db, 10)).toEqual([]);
  });

  it("makes the second worker wait for the first transaction, then declines it", async () => {
    const db = await setup();
    const attemptId = await createQueuedAttempt(db);

    // Worker A claims inside a transaction and holds it, exactly as the submit
    // worker does while it assembles the dispatch package. Worker B's claim
    // blocks on A's row lock; when A commits, B re-evaluates the predicate
    // against the freshly committed row and finds the lease taken.
    let releaseA: (() => void) | null = null;
    const aHolds = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    let claimedByA = false;
    const workerA = db.transaction(async (tx) => {
      claimedByA = (await claimDispatchAttempt(tx, attemptId)) !== null;
      await aHolds;
    });

    // Give A time to take the row lock before B goes for it.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const workerB = claimDispatchAttempt(await secondDb(), attemptId);

    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseA?.();
    await workerA;

    expect(claimedByA).toBe(true);
    expect(await workerB).toBeNull();
  });
});
