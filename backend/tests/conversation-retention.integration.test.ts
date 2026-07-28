import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { purgeExpiredConversations } from "../src/modules/drafting/conversation-retention.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const RETENTION_DAYS = 15;

/**
 * The predicates here decide whether someone's own account of their situation
 * is deleted or kept, so they are exercised against a real Postgres rather
 * than asserted as query strings.
 */
describeIfIntegrationDb("conversation retention", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function setup(): Promise<IntegrationDb> {
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    return ctx.db;
  }

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  let unique = 0;

  /** `expiresInDays` negative means the session has already expired. */
  async function createSession(
    db: IntegrationDb,
    expiresInDays: number,
  ): Promise<string> {
    unique += 1;
    const rows = await db.execute<{ id: string }>(sql`
      INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
      VALUES (
        ${`hash-${unique}-${Date.now()}`},
        NOW() + make_interval(days => ${expiresInDays}),
        NOW() + make_interval(days => ${expiresInDays})
      )
      RETURNING id
    `);
    return firstRow(rows).id;
  }

  async function createDraft(
    db: IntegrationDb,
    sessionId: string,
    ageDays: number,
    messages = 2,
  ): Promise<string> {
    const rows = await db.execute<{ id: string }>(sql`
      INSERT INTO draft_letters (session_id, locale, created_at)
      VALUES (${sessionId}, 'de-CH', NOW() - make_interval(days => ${ageDays}))
      RETURNING id
    `);
    const draftId = firstRow(rows).id;
    for (let i = 0; i < messages; i += 1) {
      await db.execute(sql`
        INSERT INTO conversation_messages (draft_id, role, content)
        VALUES (${draftId}, 'user', ${`message ${i}`})
      `);
    }
    return draftId;
  }

  async function createAttempt(
    db: IntegrationDb,
    draftId: string,
    state: "queued" | "submitted" | "accepted" | "rejected",
    submittedDaysAgo: number | null,
    version: number,
  ): Promise<void> {
    const snapshot = await db.execute<{ id: string }>(sql`
      INSERT INTO draft_snapshots (draft_id, version, snapshot_data)
      VALUES (${draftId}, ${version}, '{}'::jsonb)
      RETURNING id
    `);
    await db.execute(sql`
      INSERT INTO dispatch_attempts (draft_id, snapshot_id, state, provider_name, submitted_at)
      VALUES (
        ${draftId},
        ${firstRow(snapshot).id},
        ${state}::dispatch_state,
        'epost',
        ${
          submittedDaysAgo === null
            ? sql`NULL`
            : sql`NOW() - make_interval(days => ${submittedDaysAgo})`
        }
      )
    `);
  }

  async function messageCount(db: IntegrationDb, draftId: string): Promise<number> {
    const rows = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM conversation_messages WHERE draft_id = ${draftId}
    `);
    return Number(firstRow(rows).count);
  }

  it("collects the conversation of an expired abandoned session", async () => {
    const db = await setup();
    const session = await createSession(db, -1);
    const draft = await createDraft(db, session, 1);

    const purged = await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(purged).toBe(2);
    expect(await messageCount(db, draft)).toBe(0);
  });

  it("keeps the conversation of a live session that has not aged out", async () => {
    const db = await setup();
    const session = await createSession(db, 3);
    const draft = await createDraft(db, session, 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(2);
  });

  it("collects an old undispatched draft even while its session is still live", async () => {
    const db = await setup();
    const session = await createSession(db, 30);
    const draft = await createDraft(db, session, RETENTION_DAYS + 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(0);
  });

  it("retains a dispatched conversation until the latest submission ages out", async () => {
    const db = await setup();
    const session = await createSession(db, -1);
    const draft = await createDraft(db, session, 60);
    await createAttempt(db, draft, "accepted", 1, 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    // The session has expired and the draft is old, but the letter went out
    // yesterday — the conversation is still the context a support query needs.
    expect(await messageCount(db, draft)).toBe(2);
  });

  it("collects a dispatched conversation once the latest submission ages out", async () => {
    const db = await setup();
    const session = await createSession(db, 30);
    const draft = await createDraft(db, session, 60);
    await createAttempt(db, draft, "accepted", RETENTION_DAYS + 1, 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(0);
  });

  it("does not let an older submission retire content a newer one still needs", async () => {
    const db = await setup();
    const session = await createSession(db, 30);
    const draft = await createDraft(db, session, 60);
    await createAttempt(db, draft, "rejected", RETENTION_DAYS + 10, 1);
    await createAttempt(db, draft, "accepted", 1, 2);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(2);
  });

  it("never collects a draft with a queued attempt still waiting to go out", async () => {
    const db = await setup();
    const session = await createSession(db, -1);
    const draft = await createDraft(db, session, 60);
    await createAttempt(db, draft, "queued", null, 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(2);
  });

  it("is not blocked forever by a rejected attempt that never got submitted", async () => {
    const db = await setup();
    const session = await createSession(db, -1);
    const draft = await createDraft(db, session, 60);
    // A rejected attempt also has submitted_at IS NULL; reading that as
    // "still pending" would retain the conversation indefinitely.
    await createAttempt(db, draft, "rejected", null, 1);

    await purgeExpiredConversations(db, RETENTION_DAYS, 100);

    expect(await messageCount(db, draft)).toBe(0);
  });

  it("counts the batch limit in drafts, not in messages", async () => {
    const db = await setup();
    const session = await createSession(db, -1);
    const older = await createDraft(db, session, 40, 3);
    const newer = await createDraft(db, session, 10, 3);

    const purged = await purgeExpiredConversations(db, RETENTION_DAYS, 1);

    // One draft's worth of rows, collected whole — never half a conversation.
    expect(purged).toBe(3);
    expect(await messageCount(db, older)).toBe(0);
    expect(await messageCount(db, newer)).toBe(3);

    const second = await purgeExpiredConversations(db, RETENTION_DAYS, 1);
    expect(second).toBe(3);
    expect(await messageCount(db, newer)).toBe(0);
  });
});
