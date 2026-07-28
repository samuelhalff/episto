import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

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
 * The retention half of erasure: which letters survive it, and which writes an
 * erased draft still accepts. `erasure.integration.test.ts` covers the payment
 * side and the child-table tombstones; this file covers the dispatch states and
 * the tightened `draft_letters` guard from `0027_erasure_audit`.
 *
 * Real Postgres, because both halves are decided in SQL — the grace window is a
 * `make_interval` comparison and the guard is a whole-row `to_jsonb` diff.
 */
describeIfIntegrationDb("session erasure retention", () => {
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
    snapshotId: string;
    senderProfileId: string;
  }

  /**
   * A finished draft: both profiles, a body, and the snapshot a dispatch
   * attempt has to point at — `dispatch_attempts.snapshot_id` is NOT NULL, so a
   * fixture without one cannot exercise any of these rules.
   */
  async function createDraft(
    db: IntegrationDb,
    sessionId: string,
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
          (session_id, locale, status, subject, body, tone, intent, metadata,
           sender_profile_id, recipient_profile_id)
        VALUES (
          ${sessionId}, 'de-CH', 'submitted', 'Kündigung',
          'Sehr geehrte Damen und Herren', 'formal', 'cancel a contract',
          ${JSON.stringify({ letter: { body: "the full drafted letter" } })}::jsonb,
          ${sender}, ${recipient}
        )
        RETURNING id
      `),
    ).id;

    const snapshotId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_snapshots (draft_id, version, snapshot_data)
        VALUES (${draftId}, 1, ${JSON.stringify(SNAPSHOT_DATA)}::jsonb)
        RETURNING id
      `),
    ).id;

    await db.execute(sql`
      INSERT INTO conversation_messages (draft_id, role, content)
      VALUES (${draftId}, 'user', 'Mein Vermieter hat die Kaution behalten')
    `);

    return { draftId, snapshotId, senderProfileId: sender };
  }

  /**
   * `updated_at` is the column the grace window is measured against, and it
   * defaults to `now()` — so a test for the expired case has to write it
   * explicitly or it silently tests the live case instead.
   */
  async function createDispatchAttempt(
    db: IntegrationDb,
    draft: DraftFixture,
    state: string,
    updatedAtSql = sql`NOW()`,
  ): Promise<void> {
    await db.execute(sql`
      INSERT INTO dispatch_attempts
        (draft_id, snapshot_id, state, provider_name, submitted_at, updated_at)
      VALUES (
        ${draft.draftId}, ${draft.snapshotId}, ${state}::dispatch_state, 'epost',
        NOW() - interval '1 hour', ${updatedAtSql}
      )
    `);
  }

  async function loadDraft(db: IntegrationDb, draftId: string) {
    return firstRow(
      await db.execute<{
        subject: string | null;
        body: string | null;
        status: string;
        sender_profile_id: string | null;
        erasure_requested_at: string | null;
      }>(sql`
        SELECT subject, body, status, sender_profile_id, erasure_requested_at
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

  /**
   * `reconciled` is only ever reached from `submitted`, so the state itself is
   * proof the provider took the letter. Leaving it out of the sent set meant
   * erasure scrubbed the record of a letter that had actually been posted.
   */
  it("retains a draft whose dispatch was reconciled", async () => {
    const db = await setup();
    const session = await createSession(db);
    const draft = await createDraft(db, session);
    await createDispatchAttempt(db, draft, "reconciled");

    const result = await eraseSessionData(db, session);

    expect(result.paidOrdersRetained).toBe(1);
    expect(result.draftsErased).toBe(0);

    const row = await loadDraft(db, draft.draftId);
    expect(row.subject).toBe("Kündigung");
    expect(row.body).toBe("Sehr geehrte Damen und Herren");
    expect(row.erasure_requested_at).toBeNull();
    // The snapshot is the copy that would actually have to be produced.
    expect(await snapshotData(db, draft.draftId)).toEqual(SNAPSHOT_DATA);
  });

  /**
   * `unknown` means we do not know whether Swiss Post has the letter. While the
   * liveness sweep still has a chance of answering, erasing underneath it could
   * destroy the only copy of a letter that is in the post.
   */
  it("refuses to erase while an unknown dispatch is inside the grace window", async () => {
    const db = await setup();
    const session = await createSession(db);
    const draft = await createDraft(db, session);
    await createDispatchAttempt(db, draft, "unknown", sql`NOW() - interval '23 hours'`);

    await expect(eraseSessionData(db, session)).rejects.toMatchObject({
      code: "ERASURE_BLOCKED_IN_FLIGHT",
      statusCode: 409,
    });

    // The refusal is a whole-transaction rollback: no half-erased draft, and no
    // audit row claiming an erasure that did not happen.
    const row = await loadDraft(db, draft.draftId);
    expect(row.subject).toBe("Kündigung");
    expect(row.erasure_requested_at).toBeNull();
    const audits = firstRow(
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count FROM erasure_audits
      `),
    );
    expect(audits.count).toBe("0");
  });

  /**
   * Past the window the block has to lift, or an attempt that never obtained a
   * `provider_reference` — reconcilable neither automatically nor by hand —
   * would make erasure permanently impossible for that session. It lifts into
   * retention, not into scrubbing: "we cannot prove it was not sent".
   */
  it("stops blocking on an unknown dispatch past the grace window, and retains it", async () => {
    const db = await setup();
    const session = await createSession(db);
    const draft = await createDraft(db, session);
    await createDispatchAttempt(db, draft, "unknown", sql`NOW() - interval '25 hours'`);

    const result = await eraseSessionData(db, session);

    expect(result.paidOrdersRetained).toBe(1);
    expect(result.draftsErased).toBe(0);

    const row = await loadDraft(db, draft.draftId);
    expect(row.subject).toBe("Kündigung");
    expect(row.erasure_requested_at).toBeNull();
    expect(await snapshotData(db, draft.draftId)).toEqual(SNAPSHOT_DATA);

    // The session's own identifiers are not part of the retention bargain: the
    // letter is kept, the ability to contact the person is not.
    const sessionRow = firstRow(
      await db.execute<{ expires_at: string }>(sql`
        SELECT expires_at FROM sessions WHERE id = ${session}
      `),
    );
    expect(new Date(sessionRow.expires_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  /**
   * The first tombstone guard allowed any update whose six content columns came
   * out null. A stale writer could still repoint the draft at a fresh profile or
   * move its status, and the guard waved it through. `0027` compares the whole
   * row instead, so every other column is frozen.
   */
  describe("the tightened tombstone freezes non-content columns", () => {
    async function erasedDraft(db: IntegrationDb): Promise<DraftFixture> {
      const session = await createSession(db);
      const draft = await createDraft(db, session);
      const result = await eraseSessionData(db, session);
      expect(result.draftsErased).toBe(1);
      return draft;
    }

    it("rejects repointing an erased draft at another profile", async () => {
      const db = await setup();
      const draft = await erasedDraft(db);
      const sessionId = firstRow(
        await db.execute<{ session_id: string }>(sql`
          SELECT session_id FROM draft_letters WHERE id = ${draft.draftId}
        `),
      ).session_id;

      // A live profile the erasure never touched, which is the whole point: the
      // erased draft would silently regain a name and an address.
      const freshProfile = firstRow(
        await db.execute<{ id: string }>(sql`
          INSERT INTO sender_profiles (session_id, first_name, last_name, address_line_1, postal_code, city, country)
          VALUES (${sessionId}, 'Beat', 'Neuer', 'Marktgasse 4', '3011', 'Bern', 'CH')
          RETURNING id
        `),
      ).id;

      await expectErasureRejection(
        db.execute(sql`
          UPDATE draft_letters SET sender_profile_id = ${freshProfile}
          WHERE id = ${draft.draftId}
        `),
      );
      expect((await loadDraft(db, draft.draftId)).sender_profile_id).toBe(
        draft.senderProfileId,
      );
    });

    it("rejects a status transition on an erased draft", async () => {
      const db = await setup();
      const draft = await erasedDraft(db);
      const statusBefore = (await loadDraft(db, draft.draftId)).status;

      // A dispatch worker that loaded the draft before the erasure finishing its
      // job: the content columns are all null already, so the old guard passed.
      await expectErasureRejection(
        db.execute(sql`
          UPDATE draft_letters SET status = 'dispatched' WHERE id = ${draft.draftId}
        `),
      );
      expect((await loadDraft(db, draft.draftId)).status).toBe(statusBefore);
    });

    it("rejects moving the tombstone itself", async () => {
      const db = await setup();
      const draft = await erasedDraft(db);
      const tombstone = (await loadDraft(db, draft.draftId)).erasure_requested_at;

      // The tombstone is the evidence that the erasure happened and when it was
      // first requested; a retry must not be able to backdate or refresh it.
      await expectErasureRejection(
        db.execute(sql`
          UPDATE draft_letters SET erasure_requested_at = NOW() - interval '1 year'
          WHERE id = ${draft.draftId}
        `),
      );
      expect((await loadDraft(db, draft.draftId)).erasure_requested_at).toEqual(
        tombstone,
      );
    });

    it("still allows the idempotent re-scrub of the content columns", async () => {
      const db = await setup();
      const draft = await erasedDraft(db);

      // The rule is "the only write an erased draft accepts is another scrub",
      // and `updated_at` is on the mutable list so the re-run may stamp it.
      await expect(
        db.execute(sql`
          UPDATE draft_letters
          SET subject = NULL, body = NULL, tone = NULL, intent = NULL,
              enclosure_note = NULL, metadata = NULL, updated_at = NOW()
          WHERE id = ${draft.draftId}
        `),
      ).resolves.toBeDefined();
    });
  });
});
