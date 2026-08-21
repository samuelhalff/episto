import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findStuckDispatchAttempts: vi.fn(),
  findUnwatchedUnknownDispatches: vi.fn(),
  findStuckSubmittedDispatches: vi.fn(),
  updateDraftStatusForDispatchSubmission: vi.fn(),
  transitionDispatchState: vi.fn(),
  requeueDispatchSubmission: vi.fn(),
  enqueueDispatchReconciliation: vi.fn(),
  requeueDispatchReconciliation: vi.fn(),
  sweepDispatchAttemptsUnderReview: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: { DISPATCH_LIVENESS: "dispatch-liveness" },
  createWorker: vi.fn(),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({}),
  schema: {},
}));

vi.mock("../src/modules/dispatch/dispatch.service.js", () => ({
  findStuckDispatchAttempts: mocks.findStuckDispatchAttempts,
  findUnwatchedUnknownDispatches: mocks.findUnwatchedUnknownDispatches,
  findStuckSubmittedDispatches: mocks.findStuckSubmittedDispatches,
  transitionDispatchState: mocks.transitionDispatchState,
}));

vi.mock("../src/workers/dispatch-settlement.js", () => ({
  updateDraftStatusForDispatchSubmission: mocks.updateDraftStatusForDispatchSubmission,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  requeueDispatchSubmission: mocks.requeueDispatchSubmission,
  enqueueDispatchReconciliation: mocks.enqueueDispatchReconciliation,
  requeueDispatchReconciliation: mocks.requeueDispatchReconciliation,
}));

// The under-review dwell sweep has its own integration test against a real
// database (dispatch-under-review.integration.test.ts); here it only has to be
// wired into the same pass.
vi.mock("../src/modules/dispatch/dispatch-review-notifications.js", () => ({
  sweepDispatchAttemptsUnderReview: mocks.sweepDispatchAttemptsUnderReview,
}));

const db = {} as never;

/**
 * The user story: a paid letter whose worker died must not sit queued forever,
 * and must not be posted a second time on its way out of that state.
 */
describe("dispatch liveness sweep", () => {
  beforeEach(() => {
    mocks.findStuckDispatchAttempts.mockReset();
    mocks.findUnwatchedUnknownDispatches.mockReset().mockResolvedValue([]);
    mocks.findStuckSubmittedDispatches.mockReset().mockResolvedValue([]);
    mocks.updateDraftStatusForDispatchSubmission.mockReset();
    mocks.transitionDispatchState.mockReset();
    mocks.requeueDispatchSubmission.mockReset();
    mocks.enqueueDispatchReconciliation.mockReset();
    mocks.requeueDispatchReconciliation.mockReset();
    mocks.sweepDispatchAttemptsUnderReview.mockReset().mockResolvedValue(0);
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  it("re-queues an attempt that never reached the provider", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([
      {
        id: "dispatch-1",
        draftId: "draft-1",
        snapshotId: "snapshot-1",
        paymentAttemptId: "payment-1",
        submissionStarted: false,
      },
    ]);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");

    expect(await sweepStuckDispatches(db)).toEqual({
      requeued: 1,
      flaggedUnknown: 0,
      reconciliationRedriven: 0,
      submittedRedriven: 0,
      underReviewNotified: 0,
    });
    expect(mocks.requeueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-1",
    });
    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
  });

  it("never re-queues an attempt that already reached the provider", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([
      {
        id: "dispatch-2",
        draftId: "draft-2",
        snapshotId: "snapshot-2",
        paymentAttemptId: "payment-2",
        submissionStarted: true,
      },
    ]);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");

    expect(await sweepStuckDispatches(db)).toEqual({
      requeued: 0,
      flaggedUnknown: 1,
      reconciliationRedriven: 0,
      submittedRedriven: 0,
      underReviewNotified: 0,
    });
    // The draft has to follow the attempt, or the user sees a paid letter
    // still sitting in `ready`.
    expect(mocks.updateDraftStatusForDispatchSubmission).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      "submitted",
    );
    expect(mocks.requeueDispatchSubmission).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      db,
      "dispatch-2",
      "unknown",
      expect.objectContaining({ failureReason: expect.any(String) }),
    );
    expect(mocks.enqueueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-2",
    });
  });

  it("keeps going when one letter cannot be recovered", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([
      {
        id: "dispatch-bad",
        draftId: "draft-bad",
        snapshotId: "snapshot-bad",
        paymentAttemptId: "payment-bad",
        submissionStarted: false,
      },
      {
        id: "dispatch-good",
        draftId: "draft-good",
        snapshotId: "snapshot-good",
        paymentAttemptId: "payment-good",
        submissionStarted: false,
      },
    ]);
    mocks.requeueDispatchSubmission
      .mockRejectedValueOnce(new Error("redis down"))
      .mockResolvedValueOnce(undefined);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");

    expect(await sweepStuckDispatches(db)).toEqual({
      requeued: 1,
      flaggedUnknown: 0,
      reconciliationRedriven: 0,
      submittedRedriven: 0,
      underReviewNotified: 0,
    });
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it("leaves an attempt with no payment for a human", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([
      {
        id: "dispatch-3",
        draftId: "draft-3",
        snapshotId: "snapshot-3",
        paymentAttemptId: null,
        submissionStarted: false,
      },
    ]);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");

    expect(await sweepStuckDispatches(db)).toEqual({
      requeued: 0,
      flaggedUnknown: 0,
      reconciliationRedriven: 0,
      submittedRedriven: 0,
      underReviewNotified: 0,
    });
    expect(mocks.requeueDispatchSubmission).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  /**
   * The correlated failure: whatever made the outcome unknown — Redis down,
   * the box going away — is often the same thing that swallows the hand-off to
   * reconciliation. An `unknown` attempt with nothing watching it is a paid
   * letter nobody will ever look at.
   */
  it("re-drives reconciliation for an unknown attempt nothing is watching", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([]);
    mocks.findUnwatchedUnknownDispatches.mockResolvedValue([
      { id: "dispatch-orphan", draftId: "draft-orphan" },
    ]);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");
    const result = await sweepStuckDispatches(db);

    expect(mocks.enqueueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-orphan",
    });
    expect(result.reconciliationRedriven).toBe(1);
    // It must not be resubmitted — that is how a letter gets posted twice.
    expect(mocks.requeueDispatchSubmission).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
  });

  it("re-drives reconciliation for a submitted attempt accepted by the provider but not finalized", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([]);
    mocks.findStuckSubmittedDispatches.mockResolvedValue([
      { id: "dispatch-submitted", draftId: "draft-submitted" },
    ]);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");
    const result = await sweepStuckDispatches(db);

    expect(mocks.requeueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-submitted",
    });
    expect(result.submittedRedriven).toBe(1);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      { dispatchId: "dispatch-submitted", draftId: "draft-submitted" },
      "Submitted dispatch stuck without finalization; reconciliation re-driven",
    );
  });

  it("keeps sweeping when one re-drive fails", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([]);
    mocks.findUnwatchedUnknownDispatches.mockResolvedValue([
      { id: "dispatch-a", draftId: "draft-a" },
      { id: "dispatch-b", draftId: "draft-b" },
    ]);
    mocks.enqueueDispatchReconciliation
      .mockRejectedValueOnce(new Error("redis down"))
      .mockResolvedValueOnce(undefined);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");
    const result = await sweepStuckDispatches(db);

    expect(result.reconciliationRedriven).toBe(1);
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it("runs the under-review dwell sweep in the same pass", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([]);
    mocks.sweepDispatchAttemptsUnderReview.mockResolvedValue(2);

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");
    const result = await sweepStuckDispatches(db);

    expect(mocks.sweepDispatchAttemptsUnderReview).toHaveBeenCalledWith(db);
    expect(result.underReviewNotified).toBe(2);
  });

  it("still reports the recovery work when the under-review sweep fails", async () => {
    mocks.findStuckDispatchAttempts.mockResolvedValue([]);
    mocks.findUnwatchedUnknownDispatches.mockResolvedValue([
      { id: "dispatch-c", draftId: "draft-c" },
    ]);
    mocks.sweepDispatchAttemptsUnderReview.mockRejectedValue(new Error("db down"));

    const { sweepStuckDispatches } =
      await import("../src/workers/dispatch-liveness.worker.js");
    const result = await sweepStuckDispatches(db);

    expect(result.reconciliationRedriven).toBe(1);
    expect(result.underReviewNotified).toBe(0);
    expect(mocks.logger.error).toHaveBeenCalled();
  });
});
