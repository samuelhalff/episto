import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { createIntegrationDb, integrationDatabaseUrl } from "./postgres-integration.js";

export type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

export interface DraftFixture {
  sessionId: string;
  draftId: string;
  fileId: string;
}

export interface FixtureOptions {
  /** Drives which branch of attachment ingestion the file takes. */
  mimeType?: string;
  /** What the upload route would have left on the row before ingestion runs. */
  extractionStatus?: string | null;
}

export function firstRow<T>(result: { rows: T[] }): T {
  const [row] = result.rows;
  if (!row) throw new Error("Expected the fixture insert to return a row");
  return row;
}

let unique = 0;

export interface LockConnection {
  client: pg.Client;
  db: IntegrationDb;
  /**
   * Resolved at connect time, on purpose. Asking a connection for its own pid
   * once it is blocked never answers: node-postgres queues the question behind
   * the statement that is waiting for the lock.
   */
  pid: number;
}

/**
 * A Postgres harness for the row-lock tests.
 *
 * Serialisation can only be demonstrated against a real server: a mocked db has
 * no lock queue and no notion of one transaction waiting for another, so a test
 * against one proves nothing beyond "these two functions ran". Everything here
 * exists to give each simulated request a connection of its own and to pin the
 * exact instant at which one of them is queued behind another's lock.
 */
export interface DraftLockHarness {
  /** The migration connection — used for out-of-band assertions. */
  db: IntegrationDb;
  /** A connection of its own, so two requests can actually contend. */
  openConnection(): Promise<LockConnection>;
  /**
   * Wait until this connection is queued behind someone else's lock.
   *
   * This is what pins the interleaving each bug needed: without it a test only
   * proves that two operations ran in some order, which the sequential case
   * already does.
   */
  waitUntilBlocked(connection: LockConnection): Promise<void>;
  /** Who is holding the lock this connection is waiting for. */
  blockingPids(connection: LockConnection): Promise<number[]>;
  createFixture(options?: FixtureOptions): Promise<DraftFixture>;
  close(): Promise<void>;
}

export async function createDraftLockHarness(): Promise<DraftLockHarness> {
  const ctx = await createIntegrationDb();
  const openClients: pg.Client[] = [];

  const openConnection = async (): Promise<LockConnection> => {
    const client = new pg.Client({ connectionString: integrationDatabaseUrl ?? "" });
    await client.connect();
    await client.query(`SET search_path TO "${ctx.schemaName}"`);
    openClients.push(client);
    const result = await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
    const row = result.rows[0];
    if (!row) throw new Error("Expected a backend pid");
    return { client, db: drizzle(client) as unknown as IntegrationDb, pid: row.pid };
  };

  // Its own connection: every other one in a lock test is, by design, either
  // blocked or about to be, so none of them can answer questions about locks.
  const observer = await openConnection();

  const blockingPids = async (connection: LockConnection): Promise<number[]> => {
    const result = await observer.client.query<{ pids: number[] }>(
      "SELECT pg_blocking_pids($1) AS pids",
      [connection.pid],
    );
    return result.rows[0]?.pids ?? [];
  };

  const waitUntilBlocked = async ({ pid }: LockConnection): Promise<void> => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const result = await observer.client.query<{ blocked: string }>(
        "SELECT count(*)::text AS blocked FROM pg_locks WHERE pid = $1 AND NOT granted",
        [pid],
      );
      if (Number(result.rows[0]?.blocked ?? 0) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Backend ${pid} never blocked on a lock`);
  };

  const createFixture = async (options: FixtureOptions = {}): Promise<DraftFixture> => {
    unique += 1;
    const db = ctx.db;
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
          (session_id, draft_id, kind, storage_key, original_filename, mime_type,
           size_bytes, status, extraction_status)
        VALUES (
          ${sessionId}, ${draftId}, 'attachment', ${`attachments/${sessionId}/contract-${unique}`},
          'contract.pdf', ${options.mimeType ?? "application/pdf"}, 1024, 'active',
          ${options.extractionStatus ?? null}
        )
        RETURNING id
      `),
    ).id;

    return { sessionId, draftId, fileId };
  };

  return {
    db: ctx.db,
    openConnection,
    blockingPids,
    waitUntilBlocked,
    createFixture,
    async close() {
      for (const client of openClients.splice(0)) {
        await client.end().catch(() => undefined);
      }
      await ctx.cleanup();
    },
  };
}

export async function statusOf(db: IntegrationDb, draftId: string): Promise<string> {
  const rows = await db.execute<{ status: string }>(sql`
    SELECT status FROM draft_letters WHERE id = ${draftId}
  `);
  return firstRow(rows).status;
}

export async function fileStatus(db: IntegrationDb, fileId: string): Promise<string> {
  const rows = await db.execute<{ status: string }>(sql`
    SELECT status FROM file_assets WHERE id = ${fileId}
  `);
  return firstRow(rows).status;
}

export async function attachmentIdsInLatestSnapshot(
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
