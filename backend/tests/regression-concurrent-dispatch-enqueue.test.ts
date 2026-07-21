/**
 * Regression: Two concurrent enqueueDispatchIfEligible() calls for the same
 * payment must produce exactly one dispatch job/attempt.
 *
 * User stories:
 * - "As a system, when Stripe sends overlapping webhooks (e.g.
 *    payment_intent.amount_capturable_updated + payment_intent.succeeded),
 *    only one dispatch attempt is created."
 * - "As a system, the Redis distributed lock serialises concurrent enqueue
 *    calls so the second caller skips without error."
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const enqueueFn = vi.fn().mockResolvedValue(undefined);
  const lockReleaseFn = vi.fn().mockResolvedValue(undefined);
  let lockCallCount = 0;

  const mockLock = { release: lockReleaseFn };

  return {
    enqueueDispatchSubmission: enqueueFn,
    lockRelease: lockReleaseFn,
    mockLock,
    acquireRedisLock: vi.fn().mockImplementation(async () => {
      lockCallCount++;
      if (lockCallCount === 1) {
        return mockLock;
      }
      return null;
    }),
    resetLockCallCount: () => {
      lockCallCount = 0;
    },
  };
});

// ---------------------------------------------------------------------------
// module mocks
// ---------------------------------------------------------------------------

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchSubmission: mocks.enqueueDispatchSubmission,
  buildDispatchJobId: vi.fn((id: string) => `dispatch-${id}`),
}));

vi.mock("../src/shared/redis-lock.js", () => ({
  acquireRedisLock: mocks.acquireRedisLock,
}));

vi.mock("../src/db/index.js", () => ({
  schema: {
    draftLetters: {
      id: "draft_letters.id",
      signatureFlowMode: "draft_letters.signature_flow_mode",
    },
    paymentAttempts: {
      id: "payment_attempts.id",
      state: "payment_attempts.state",
    },
    draftSnapshots: {
      id: "draft_snapshots.id",
      draftId: "draft_snapshots.draft_id",
      version: "draft_snapshots.version",
      renderedPdfAssetId: "draft_snapshots.rendered_pdf_asset_id",
    },
  },
}));

vi.mock("../src/modules/dispatch/dispatch-eligibility.js", () => ({
  canSubmitDispatchForDraft: vi.fn().mockReturnValue(true),
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  getPaymentAttemptById: vi.fn().mockResolvedValue({
    id: "pay-1",
    draftId: "draft-1",
    sessionId: "sess-1",
    state: "captured",
    stripePaymentIntentId: "pi_1",
    stripeChargeId: "ch_1",
    amountCents: 490,
    currency: "CHF",
    breakdown: {},
    failureReason: null,
    refundReason: null,
    verifiedPhoneE164: null,
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  getLatestSnapshot: vi.fn().mockResolvedValue({
    id: "snap-1",
    draftId: "draft-1",
    version: 1,
    schemaVersion: 1,
    snapshotData: {},
    renderedPdfAssetId: "pdf-1",
    createdAt: new Date(),
  }),
}));

// fake drizzle DB that returns a valid draft row
function makeFakeDb() {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      {
        signatureFlowMode: "visual",
      },
    ]),
  };
  return {
    select: vi.fn().mockReturnValue(selectChain),
    _selectChain: selectChain,
  };
}

describe("regression: concurrent dispatch enqueue idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetLockCallCount();
  });

  it("serialises two concurrent calls so only one dispatch job is enqueued", async () => {
    const { enqueueDispatchIfEligible } =
      await import("../src/modules/payments/payment-route-helpers.js");

    const db = makeFakeDb();
    const log = {
      error: vi.fn(),
      warn: vi.fn(),
    };

    // Run two calls concurrently with the same paymentId
    const [result1, result2] = await Promise.all([
      enqueueDispatchIfEligible({
        db: db as never,
        draftId: "draft-1",
        paymentId: "pay-1",
        log,
        failureMessage: "test failure 1",
      }),
      enqueueDispatchIfEligible({
        db: db as never,
        draftId: "draft-1",
        paymentId: "pay-1",
        log,
        failureMessage: "test failure 2",
      }),
    ]);

    // Both calls should resolve without throwing
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();

    // Exactly one dispatch job should have been enqueued
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snap-1",
      paymentId: "pay-1",
    });

    // The lock should have been acquired twice (once per call)
    expect(mocks.acquireRedisLock).toHaveBeenCalledTimes(2);
    expect(mocks.acquireRedisLock).toHaveBeenCalledWith("dispatch:enqueue:pay-1", 30_000);

    // The warning log should have been called for the second call
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      { paymentId: "pay-1", draftId: "draft-1", lockKey: "dispatch:enqueue:pay-1" },
      "Skipping dispatch enqueue — lock held by another process",
    );

    // The lock from the first call should have been released
    expect(mocks.lockRelease).toHaveBeenCalledTimes(1);
  });

  it("does not enqueue dispatch when eligibility check fails", async () => {
    // Override eligibility to return false for this test
    const { canSubmitDispatchForDraft } =
      await import("../src/modules/dispatch/dispatch-eligibility.js");
    (canSubmitDispatchForDraft as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const { enqueueDispatchIfEligible } =
      await import("../src/modules/payments/payment-route-helpers.js");

    const db = makeFakeDb();
    const log = { error: vi.fn(), warn: vi.fn() };

    await enqueueDispatchIfEligible({
      db: db as never,
      draftId: "draft-1",
      paymentId: "pay-2",
      log,
      failureMessage: "test failure",
    });

    // Lock was acquired
    expect(mocks.acquireRedisLock).toHaveBeenCalledWith("dispatch:enqueue:pay-2", 30_000);

    // No dispatch job enqueued (eligibility failed)
    expect(mocks.enqueueDispatchSubmission).not.toHaveBeenCalled();

    // Lock was released
    expect(mocks.lockRelease).toHaveBeenCalledTimes(1);
  });
});
