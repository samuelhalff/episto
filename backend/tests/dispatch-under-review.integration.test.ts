/**
 * "We don't know yet" — the email we owe a customer whose letter has been in
 * limbo for a day.
 *
 * The behaviour under test is a dwell, not a state change. Almost every
 * `unknown` resolves on the next reconcile poll, so the sweep must stay silent
 * about a fresh one; it must speak exactly once about an old one; and it must
 * never speak about one that has since been answered. Those three are the
 * whole product decision, so they are tested against a real Postgres, with the
 * real SQL — the interval arithmetic and the conditional claim are the parts
 * that could be wrong.
 *
 * Only the outbound queue is mocked: everything from candidate selection to the
 * rendered job payload is the production path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ add: mocks.add }),
  QUEUE_NAMES: { SEND_EMAIL: "send-email" },
}));

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => false,
  env: () => ({
    CORS_ORIGIN: "https://episto.ch",
    APP_PUBLIC_URL: "https://episto.ch",
    STATEMENT_RETENTION_DAYS: 10,
    APP_DISPLAY_NAME: "episto",
    SUPPORT_EMAIL: "contact@episto.ch",
    LEGAL_ENTITY_NAME: "West Bay SA",
    LEGAL_ENTITY_ADDRESS_LINE_1: "Route de Genthod 1",
    LEGAL_ENTITY_ADDRESS_LINE_2: "1294 Genthod",
    LEGAL_ENTITY_COUNTRY: "Switzerland",
    LEGAL_ENTITY_UID_VAT: "CHE-107.892.984 MWST",
  }),
}));

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  issueOrderAccessToken: vi.fn().mockResolvedValue("test-order-token"),
}));

const { sweepDispatchAttemptsUnderReview, UNDER_REVIEW_DWELL_HOURS } =
  await import("../src/modules/dispatch/dispatch-review-notifications.js");

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("dispatch under-review dwell sweep", () => {
  let cleanup: (() => Promise<void>) | null = null;
  let db: IntegrationDb;
  let unique = 0;

  beforeEach(async () => {
    mocks.add.mockReset();
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    db = ctx.db;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  function firstRow<T>(result: { rows: T[] }): T {
    const [row] = result.rows;
    if (!row) throw new Error("Expected the fixture insert to return a row");
    return row;
  }

  interface AttemptFixture {
    attemptId: string;
    draftId: string;
  }

  /**
   * A paid letter whose provider outcome never came back, `unknownHoursAgo`
   * hours ago. `email` null models a session erased under a deletion request.
   */
  async function seedUnknownAttempt(options: {
    unknownHoursAgo: number;
    email?: string | null;
    state?: string;
  }): Promise<AttemptFixture> {
    unique += 1;
    const email = options.email === undefined ? "customer@example.test" : options.email;
    const state = options.state ?? "unknown";

    const sessionId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at,
                              email, locale)
        VALUES (${`review-${unique}-${Date.now()}`}, NOW() + interval '3 days',
                NOW() + interval '3 days', ${email}, 'de-CH')
        RETURNING id
      `),
    ).id;

    const draftId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO draft_letters (session_id, status, locale, delivery_type)
        VALUES (${sessionId}, 'submitted', 'de-CH', 'standard')
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

    const paymentId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO payment_attempts (draft_id, session_id, amount_cents, state,
                                      breakdown, captured_at, captured_at_source,
                                      order_access_token_expires_at,
                                      order_access_token_hash)
        VALUES (${draftId}, ${sessionId}, 455, 'captured', '{}'::jsonb, NOW(),
                'webhook', NOW() + interval '10 days', ${`hash-${unique}`})
        RETURNING id
      `),
    ).id;

    const attemptId = firstRow(
      await db.execute<{ id: string }>(sql`
        INSERT INTO dispatch_attempts (draft_id, snapshot_id, payment_attempt_id,
                                       state, provider_name, provider_reference,
                                       submitted_at)
        VALUES (${draftId}, ${snapshotId}, ${paymentId}, ${state}::dispatch_state,
                'test', ${`ref-${unique}`}, NOW())
        RETURNING id
      `),
    ).id;

    // The dwell is measured from the transition into `unknown`, so the status
    // event is the fixture that matters — not `updated_at`, which every
    // reconcile poll bumps.
    await db.execute(sql`
      INSERT INTO dispatch_status_events (dispatch_attempt_id, previous_state,
                                          new_state, source, created_at)
      VALUES (${attemptId}, 'submitted', 'unknown', 'test',
              NOW() - make_interval(hours => ${options.unknownHoursAgo}))
    `);

    return { attemptId, draftId };
  }

  /** Raw `execute` hands timestamps back as strings; only null-ness matters here. */
  async function notifiedAt(attemptId: string): Promise<string | null> {
    const row = firstRow(
      await db.execute<{ under_review_notified_at: string | null }>(sql`
        SELECT under_review_notified_at FROM dispatch_attempts WHERE id = ${attemptId}
      `),
    );
    return row.under_review_notified_at;
  }

  it("says nothing while the attempt is younger than the dwell window", async () => {
    // The common case by far: a transient provider timeout that the next
    // reconcile poll will answer. Mailing here is a false alarm.
    const { attemptId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS - 1,
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(await notifiedAt(attemptId)).toBeNull();
  });

  it("sends once the dwell window has elapsed, and says only what we know", async () => {
    const { attemptId, draftId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 1,
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(1);
    expect(mocks.add).toHaveBeenCalledTimes(1);

    const [name, job, opts] = mocks.add.mock.calls[0] as [
      string,
      { to: string; template: string; locale: string; data: Record<string, unknown> },
      { jobId: string },
    ];
    expect(name).toBe("dispatch-under-review");
    expect(job.template).toBe("dispatch-under-review");
    expect(job.to).toBe("customer@example.test");
    expect(job.locale).toBe("de-CH");
    expect(job.data.orderRef).toEqual(expect.any(String));
    expect(job.data.supportEmail).toBe("contact@episto.ch");
    // Keyed on the attempt: a redelivered sweep job cannot produce a second send.
    expect(opts.jobId).toBe(`dispatch-under-review-${attemptId}`);
    expect(draftId).toEqual(expect.any(String));

    expect(await notifiedAt(attemptId)).toEqual(expect.any(String));
  });

  it("does not send a second time on the next sweep", async () => {
    const { attemptId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 48,
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(1);
    const firstNotifiedAt = await notifiedAt(attemptId);

    mocks.add.mockClear();
    // The sweep runs every few minutes for as long as the attempt stays unknown.
    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(await notifiedAt(attemptId)).toEqual(firstNotifiedAt);
  });

  it("never tells a customer their accepted letter is in doubt", async () => {
    // Long past the dwell window, but reconciliation got a definitive answer.
    const { attemptId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 72,
      state: "accepted",
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(await notifiedAt(attemptId)).toBeNull();
  });

  it("stays silent for a rejected attempt, which has its own email", async () => {
    await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 72,
      state: "rejected",
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("stays silent when the session has no email left", async () => {
    // An erased session is a completed deletion request, not a failure.
    const { attemptId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 1,
      email: null,
    });

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
    // Still marked: there will never be an address, so re-checking every sweep
    // for the lifetime of the row buys nothing.
    expect(await notifiedAt(attemptId)).toEqual(expect.any(String));
  });

  it("keeps the attempt claimable when the queue is down", async () => {
    const { attemptId } = await seedUnknownAttempt({
      unknownHoursAgo: UNDER_REVIEW_DWELL_HOURS + 1,
    });
    mocks.add.mockRejectedValueOnce(new Error("redis down"));

    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(0);
    expect(await notifiedAt(attemptId)).toBeNull();

    // The next sweep gets it out.
    expect(await sweepDispatchAttemptsUnderReview(db)).toBe(1);
    expect(await notifiedAt(attemptId)).toEqual(expect.any(String));
  });
});
