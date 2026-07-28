import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import pg from "pg";

import { eraseSessionData } from "../src/modules/admin/admin-erasure.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

/** A snapshot holds the whole letter: body, sender and recipient addresses. */
const SNAPSHOT_DATA = {
  schemaVersion: 1,
  locale: "de-CH",
  subject: "Kündigung",
  body: "Sehr geehrte Damen und Herren, hiermit kündige ich.",
  sender: { firstName: "Anna", lastName: "Muster", city: "Bern" },
  recipient: { company: "Swisscom", city: "Bern" },
};

/**
 * Erasure is the one operation a user can demand and we must be able to prove.
 * These run against a real Postgres because half the guarantee is enforced by
 * triggers (migration `0024_draft_erasure_tombstone`), which a mocked db cannot
 * exercise at all.
 */
describeIfIntegrationDb("session erasure", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  let schemaName = "";

  async function setup(): Promise<IntegrationDb> {
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    schemaName = ctx.schemaName;
    return ctx.db;
  }

  /** A second connection, so a race can actually be two concurrent sessions. */
  async function secondConnection(): Promise<pg.Client> {
    const client = new pg.Client({ connectionString: integrationDatabaseUrl ?? "" });
    await client.connect();
    await client.query(`SET search_path TO "${schemaName}"`);
    return client;
  }

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  /**
   * Drizzle wraps the driver error, so assert on the SQLSTATE the guard raises
   * rather than on a message the ORM may reshape.
   */
  async function expectErasureRejection(promise: Promise<unknown>): Promise<void> {
    let caught: unknown;
    try {
      await promise;
    } catch (error) {
      caught = error;
    }
    const cause = (caught as { cause?: { code?: string; message?: string } } | undefined)
      ?.cause;
    expect(cause?.code, `expected SQLSTATE ZE001, got: ${String(caught)}`).toBe("ZE001");
    expect(cause?.message).toMatch(/was erased/);
  }

  let unique = 0;

  async function createSession(db: IntegrationDb): Promise<string> {
    unique += 1;
    const rows = await db.execute<{ id: string }>(sql`
      INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
      VALUES (${`hash-${unique}-${Date.now()}`}, NOW() + interval '3 days', NOW() + interval '3 days')
      RETURNING id
    `);
    return firstRow(rows).id;
  }

  interface DraftFixture {
    draftId: string;
    senderProfileId: string;
    recipientProfileId: string;
  }

  /** A draft mid-conversation: profiles, metadata, a message and a snapshot. */
  async function createDraft(
    db: IntegrationDb,
    sessionId: string,
    options: { subject?: string | null } = {},
  ): Promise<DraftFixture> {
    const sender = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sender_profiles (session_id, first_name, last_name, address_line_1, postal_code, city, country)
        VALUES (${sessionId}, 'Anna', 'Muster', 'Bahnhofstrasse 1', '3011', 'Bern', 'CH')
        RETURNING id
      `),
    ).id;
    const recipient = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO recipient_profiles (session_id, company, address_line_1, postal_code, city, country)
        VALUES (${sessionId}, 'Swisscom AG', 'Alte Tiefenaustrasse 6', '3050', 'Bern', 'CH')
        RETURNING id
      `),
    ).id;

    const draftId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters
          (session_id, locale, subject, body, tone, intent, enclosure_note, metadata,
           sender_profile_id, recipient_profile_id)
        VALUES (
          ${sessionId}, 'de-CH', ${options.subject ?? "Kündigung"},
          ${options.subject === null ? null : "Sehr geehrte Damen und Herren"},
          ${options.subject === null ? null : "formal"},
          ${options.subject === null ? null : "cancel a contract"},
          ${options.subject === null ? null : "Kopie des Vertrags"},
          ${JSON.stringify({ letter: { body: "the full drafted letter" } })}::jsonb,
          ${sender}, ${recipient}
        )
        RETURNING id
      `),
    ).id;

    await db.execute(sql`
      INSERT INTO conversation_messages (draft_id, role, content)
      VALUES (${draftId}, 'user', 'Mein Vermieter hat die Kaution behalten')
    `);
    await db.execute(sql`
      INSERT INTO draft_snapshots (draft_id, version, snapshot_data)
      VALUES (${draftId}, 1, ${JSON.stringify(SNAPSHOT_DATA)}::jsonb)
    `);

    return { draftId, senderProfileId: sender, recipientProfileId: recipient };
  }

  async function loadDraft(db: IntegrationDb, draftId: string) {
    return firstRow(
      await db.execute<{
        subject: string | null;
        body: string | null;
        metadata: unknown;
        erasure_requested_at: string | null;
      }>(sql`
        SELECT subject, body, metadata, erasure_requested_at
        FROM draft_letters WHERE id = ${draftId}
      `),
    );
  }

  async function snapshotData(db: IntegrationDb, draftId: string): Promise<unknown> {
    return firstRow(
      await db.execute<{ snapshot_data: unknown }>(sql`
        SELECT snapshot_data FROM draft_snapshots WHERE draft_id = ${draftId}
      `),
    ).snapshot_data;
  }

  it("erases the letter, its metadata, its snapshot and its conversation", async () => {
    const db = await setup();
    const session = await createSession(db);
    const { draftId } = await createDraft(db, session);

    const result = await eraseSessionData(db, session);

    expect(result.draftsErased).toBe(1);
    const draft = await loadDraft(db, draftId);
    expect(draft.subject).toBeNull();
    expect(draft.body).toBeNull();
    // `metadata` is where the drafting model persists the structured document,
    // letter body and all — erasure used to leave that copy behind.
    expect(draft.metadata).toBeNull();
    expect(draft.erasure_requested_at).not.toBeNull();
    // As did the snapshot, a frozen copy of the letter and both addresses.
    expect(await snapshotData(db, draftId)).toEqual({});

    const messages = firstRow(
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count FROM conversation_messages WHERE draft_id = ${draftId}
      `),
    );
    expect(messages.count).toBe("0");
  });

  it("erases a draft still being collected, which has no subject yet", async () => {
    const db = await setup();
    const session = await createSession(db);
    // The old idempotency heuristic read "subject, body and tone are all null"
    // as "already erased" — true of every draft the user abandoned early, which
    // still held their name, address, metadata and conversation.
    const { draftId, senderProfileId } = await createDraft(db, session, {
      subject: null,
    });

    const result = await eraseSessionData(db, session);

    expect(result.draftsErased).toBe(1);
    expect((await loadDraft(db, draftId)).metadata).toBeNull();
    const sender = firstRow(
      await db.execute<{ first_name: string }>(sql`
        SELECT first_name FROM sender_profiles WHERE id = ${senderProfileId}
      `),
    );
    expect(sender.first_name).toBe("[erased]");
  });

  it("is idempotent and keeps the original erasure time", async () => {
    const db = await setup();
    const session = await createSession(db);
    const { draftId } = await createDraft(db, session);

    const first = await eraseSessionData(db, session);
    const tombstone = (await loadDraft(db, draftId)).erasure_requested_at;
    const second = await eraseSessionData(db, session);

    expect(first.draftsErased).toBe(1);
    // Already erased, so nothing new was erased — but re-running must not fail.
    expect(second.draftsErased).toBe(0);
    expect((await loadDraft(db, draftId)).erasure_requested_at).toEqual(tombstone);
  });

  describe("the tombstone refuses stale writes", () => {
    async function erasedDraft(db: IntegrationDb): Promise<string> {
      const session = await createSession(db);
      const { draftId } = await createDraft(db, session);
      await eraseSessionData(db, session);
      return draftId;
    }

    it("rejects a message from an AI job that loaded the draft before erasure", async () => {
      const db = await setup();
      const draftId = await erasedDraft(db);

      await expectErasureRejection(
        db.execute(sql`
          INSERT INTO conversation_messages (draft_id, role, content)
          VALUES (${draftId}, 'assistant', 'Here is your letter')
        `),
      );
    });

    it("rejects a body rewrite on an erased draft", async () => {
      const db = await setup();
      const draftId = await erasedDraft(db);

      await expectErasureRejection(
        db.execute(sql`
          UPDATE draft_letters SET body = 'resurrected' WHERE id = ${draftId}
        `),
      );
    });

    it("rejects a snapshot write that would resurrect the erased letter", async () => {
      const db = await setup();
      const draftId = await erasedDraft(db);

      // `setSnapshotPdfAsset` reads the snapshot, adds a page count and writes
      // the whole document back — the exact shape of this attack.
      await expectErasureRejection(
        db.execute(sql`
          UPDATE draft_snapshots
          SET snapshot_data = ${JSON.stringify(SNAPSHOT_DATA)}::jsonb
          WHERE draft_id = ${draftId}
        `),
      );

      await expectErasureRejection(
        db.execute(sql`
          INSERT INTO draft_snapshots (draft_id, version, snapshot_data)
          VALUES (${draftId}, 2, ${JSON.stringify(SNAPSHOT_DATA)}::jsonb)
        `),
      );
    });

    it("rejects a new attachment, payment or dispatch on an erased draft", async () => {
      const db = await setup();
      const draftId = await erasedDraft(db);
      const sessionId = firstRow(
        await db.execute<{ session_id: string }>(sql`
          SELECT session_id FROM draft_letters WHERE id = ${draftId}
        `),
      ).session_id;

      await expectErasureRejection(
        db.execute(sql`
          INSERT INTO file_assets (session_id, draft_id, kind, storage_key, original_filename, mime_type, size_bytes)
          VALUES (${sessionId}, ${draftId}, 'attachment', ${`attachments/${draftId}/x`}, 'contract.pdf', 'application/pdf', 100)
        `),
      );

      await expectErasureRejection(
        db.execute(sql`
          INSERT INTO payment_attempts (draft_id, session_id, amount_cents, currency, breakdown)
          VALUES (${draftId}, ${sessionId}, 1000, 'CHF', '{}'::jsonb)
        `),
      );
    });

    it("blocks a writer that races an erasure, then refuses it", async () => {
      const db = await setup();
      const session = await createSession(db);
      const { draftId } = await createDraft(db, session);

      // Stand in for an erasure in progress: hold the draft row exactly as
      // `eraseSessionData` does, on its own connection, without committing yet.
      const eraser = await secondConnection();
      try {
        await eraser.query("BEGIN");
        await eraser.query(`SELECT id FROM draft_letters WHERE id = $1 FOR UPDATE`, [
          draftId,
        ]);

        // A drafting job that loaded the draft while it was still live now
        // writes its answer back. An application-side check would read "not
        // erased" here and proceed; the guard's FOR SHARE makes it wait.
        const insert = db.execute(sql`
          INSERT INTO conversation_messages (draft_id, role, content)
          VALUES (${draftId}, 'assistant', 'Here is your letter')
        `);

        let settled = false;
        void insert.then(
          () => (settled = true),
          () => (settled = true),
        );
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(settled, "the racing write should still be blocked").toBe(false);

        await eraser.query(
          `UPDATE draft_letters
             SET erasure_requested_at = now(), subject = NULL, body = NULL,
                 tone = NULL, intent = NULL, enclosure_note = NULL, metadata = NULL
           WHERE id = $1`,
          [draftId],
        );
        await eraser.query("COMMIT");

        await expectErasureRejection(insert);
      } finally {
        await eraser.query("ROLLBACK").catch(() => {});
        await eraser.end();
      }

      // The simulated erasure above only tombstoned the draft, so the user's
      // own message is still there — what must not exist is the answer the
      // racing writer tried to add after erasure.
      const resurrected = firstRow(
        await db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::text AS count FROM conversation_messages
          WHERE draft_id = ${draftId} AND role = 'assistant'
        `),
      );
      expect(resurrected.count).toBe("0");
    });

    it("still allows the erasure itself to run again", async () => {
      const db = await setup();
      const draftId = await erasedDraft(db);

      // The rule is "the only write an erased draft accepts is another scrub",
      // so re-running erasure must not be blocked by its own guard.
      await expect(
        db.execute(sql`
          UPDATE draft_snapshots SET snapshot_data = '{}'::jsonb WHERE draft_id = ${draftId}
        `),
      ).resolves.toBeDefined();
    });
  });

  it("leaves a paid order intact, including the profile it shares", async () => {
    const db = await setup();
    const session = await createSession(db);
    const paid = await createDraft(db, session);
    // A second draft in the same session reusing the same sender profile.
    const unpaidId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters (session_id, locale, subject, sender_profile_id)
        VALUES (${session}, 'de-CH', 'Zweiter Brief', ${paid.senderProfileId})
        RETURNING id
      `),
    ).id;

    await db.execute(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, currency, state, breakdown)
      VALUES (${paid.draftId}, ${session}, 1000, 'CHF', 'captured', '{}'::jsonb)
    `);

    const result = await eraseSessionData(db, session);

    expect(result.paidOrdersRetained).toBe(1);
    expect(result.draftsErased).toBe(1);

    // The paid letter is untouched…
    const paidDraft = await loadDraft(db, paid.draftId);
    expect(paidDraft.subject).toBe("Kündigung");
    expect(paidDraft.erasure_requested_at).toBeNull();
    expect(await snapshotData(db, paid.draftId)).toEqual(SNAPSHOT_DATA);

    // …including who it was addressed from, which the unpaid draft shares.
    const sender = firstRow(
      await db.execute<{ first_name: string }>(sql`
        SELECT first_name FROM sender_profiles WHERE id = ${paid.senderProfileId}
      `),
    );
    expect(sender.first_name).toBe("Anna");

    expect((await loadDraft(db, unpaidId)).subject).toBeNull();
  });

  /**
   * The latest payment row is not the question. A user who pays, is refunded,
   * and retries with a card that declines leaves `failed` on top of `refunded`
   * — and the draft behind a real charge would have been scrubbed.
   */
  it("retains a draft whose newest payment failed after an earlier capture", async () => {
    const db = await setup();
    const session = await createSession(db);
    const { draftId } = await createDraft(db, session);

    await db.execute(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, currency, state, breakdown, created_at)
      VALUES (${draftId}, ${session}, 1000, 'CHF', 'captured', '{}'::jsonb, NOW() - interval '2 days')
    `);
    await db.execute(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, currency, state, breakdown, created_at)
      VALUES (${draftId}, ${session}, 1000, 'CHF', 'failed', '{}'::jsonb, NOW())
    `);

    const result = await eraseSessionData(db, session);

    expect(result.paidOrdersRetained).toBe(1);
    expect(result.draftsErased).toBe(0);
    expect((await loadDraft(db, draftId)).subject).toBe("Kündigung");
  });

  it("refuses to erase underneath a payment that is still in flight", async () => {
    const db = await setup();
    const session = await createSession(db);
    const { draftId } = await createDraft(db, session);
    await db.execute(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, currency, state, breakdown)
      VALUES (${draftId}, ${session}, 1000, 'CHF', 'authorized', '{}'::jsonb)
    `);

    // Refusing costs the operator a retry. Scrubbing while the submit worker
    // holds the draft costs a user their letter, or us a double refund.
    await expect(eraseSessionData(db, session)).rejects.toMatchObject({
      code: "ERASURE_BLOCKED_IN_FLIGHT",
      statusCode: 409,
    });
    expect((await loadDraft(db, draftId)).subject).toBe("Kündigung");
  });

  it("erases the identifiers that never lived in the draft", async () => {
    const db = await setup();
    const session = await createSession(db);
    const { draftId } = await createDraft(db, session);

    const resumeBefore = firstRow(
      await db.execute<{ resume_token_hash: string }>(sql`
        UPDATE sessions
        SET email = 'anna@example.ch', phone_e164 = '+41791234567',
            ip_address = '203.0.113.7', phone_verified_at = NOW()
        WHERE id = ${session}
        RETURNING resume_token_hash
      `),
    ).resume_token_hash;

    await db.execute(sql`
      INSERT INTO phone_verifications
        (session_id, draft_id, phone_e164, code_hash, last_sent_at, expires_at, ip_address, user_agent)
      VALUES (${session}, ${draftId}, '+41791234567', 'code-hash', NOW(), NOW() + interval '10 minutes',
              '203.0.113.7', 'Mozilla/5.0')
    `);
    await db.execute(sql`
      INSERT INTO payment_attempts
        (draft_id, session_id, amount_cents, currency, state, breakdown,
         verified_phone_e164, order_access_token_hash)
      VALUES (${draftId}, ${session}, 1000, 'CHF', 'captured', '{}'::jsonb,
              '+41791234567', 'order-token-hash')
    `);
    await db.execute(sql`
      INSERT INTO product_events (event_name, session_id) VALUES ('draft_started', ${session})
    `);
    await db.execute(sql`
      INSERT INTO support_events (session_id, event_type, actor, details)
      VALUES (${session}, 'refund_requested', 'agent@episto.ch',
              ${JSON.stringify({ note: "called from +41791234567" })}::jsonb)
    `);

    await eraseSessionData(db, session);

    const sessionRow = firstRow(
      await db.execute<{
        email: string | null;
        phone_e164: string | null;
        ip_address: string | null;
        resume_token_hash: string;
      }>(sql`
        SELECT email, phone_e164, ip_address, resume_token_hash
        FROM sessions WHERE id = ${session}
      `),
    );
    expect(sessionRow.email).toBeNull();
    expect(sessionRow.phone_e164).toBeNull();
    expect(sessionRow.ip_address).toBeNull();
    // Rotated, not cleared: the column is NOT NULL, and what actually has to
    // die is the magic-resume link, which is looked up by this hash.
    expect(sessionRow.resume_token_hash).not.toBe(resumeBefore);

    const verification = firstRow(
      await db.execute<{ phone_e164: string; ip_address: string | null }>(sql`
        SELECT phone_e164, ip_address FROM phone_verifications WHERE session_id = ${session}
      `),
    );
    expect(verification.phone_e164).toBe("[erased]");
    expect(verification.ip_address).toBeNull();

    // The payment survives as an accounting record; the copied phone and the
    // order link that would reopen the identity do not.
    const payment = firstRow(
      await db.execute<{
        state: string;
        amount_cents: number;
        verified_phone_e164: string | null;
        order_access_token_hash: string | null;
      }>(sql`
        SELECT state, amount_cents, verified_phone_e164, order_access_token_hash
        FROM payment_attempts WHERE session_id = ${session}
      `),
    );
    expect(payment.state).toBe("captured");
    expect(payment.amount_cents).toBe(1000);
    expect(payment.verified_phone_e164).toBeNull();
    expect(payment.order_access_token_hash).toBeNull();

    const events = firstRow(
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count FROM product_events WHERE session_id = ${session}
      `),
    );
    expect(events.count).toBe("0");

    const support = firstRow(
      await db.execute<{ event_type: string; details: unknown }>(sql`
        SELECT event_type, details FROM support_events WHERE session_id = ${session}
      `),
    );
    // The audit trail is kept; the free-text payload a human typed is not.
    expect(support.event_type).toBe("refund_requested");
    expect(support.details).toEqual({ redacted: true });
  });

  it("records an audit that cannot be read back to the session", async () => {
    const db = await setup();
    const session = await createSession(db);
    await createDraft(db, session);

    await eraseSessionData(db, session, "agent@episto.ch");

    const audit = firstRow(
      await db.execute<{
        subject_digest: string;
        requested_by: string;
        drafts_erased: number;
      }>(sql`SELECT subject_digest, requested_by, drafts_erased FROM erasure_audits`),
    );
    expect(audit.requested_by).toBe("agent@episto.ch");
    expect(audit.drafts_erased).toBe(1);
    // Not the session id, and no column that could be joined back to one.
    expect(audit.subject_digest).not.toContain(session);
    expect(audit.subject_digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
