import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentDb: null as ReturnType<typeof createDbMock> | null,
  createWorker: vi.fn(),
  emailQueueAdd: vi.fn().mockResolvedValue(undefined),
  createDispatchAttempt: vi.fn(),
  getDispatchAttemptByPaymentAttemptId: vi.fn(),
  getDispatchAttempt: vi.fn(),
  transitionDispatchState: vi.fn(),
  adapterSubmit: vi.fn(),
  adapterCheckStatus: vi.fn(),
  recordEvent: vi.fn(),
  buildDispatchPackage: vi.fn(),
  settlePaymentForDispatchResolution: vi.fn(),
  canFinalizeDispatchResolution: vi.fn(),
  updateDraftStatusForDispatchResolution: vi.fn(),
  updateDraftStatusForDispatchSubmission: vi.fn(),
  enqueueDispatchReconciliation: vi.fn(),
  enqueueDispatchAcceptedEmail: vi.fn(),
  enqueueDispatchSubmittedEmail: vi.fn(),
  acquireRedisLock: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createDbMock(selectResults: unknown[][] = [[]]) {
  let selectIndex = 0;
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const select = vi.fn(() => {
    const rows = selectResults[selectIndex] ?? [];
    selectIndex += 1;
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(rows),
        })),
      })),
    };
  });

  return { select, update, updateWhere };
}

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    SUBMIT_DISPATCH: "submit-dispatch",
    RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
    SEND_EMAIL: "send-transactional-email",
  },
  createWorker: mocks.createWorker,
  getQueue: () => ({ add: mocks.emailQueueAdd }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/shared/redis-lock.js", () => ({
  acquireRedisLock: mocks.acquireRedisLock,
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    POSTAL_DISPATCH_PROVIDER: "epost",
  }),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.currentDb,
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
    },
    sessions: {
      id: "session_id",
    },
    dispatchAttempts: {
      id: "dispatch_attempt_id",
    },
  },
}));

vi.mock("../src/modules/dispatch/dispatch.service.js", () => ({
  createDispatchAttempt: mocks.createDispatchAttempt,
  getDispatchAttemptByPaymentAttemptId: mocks.getDispatchAttemptByPaymentAttemptId,
  getDispatchAttempt: mocks.getDispatchAttempt,
  transitionDispatchState: mocks.transitionDispatchState,
}));

vi.mock("../src/modules/dispatch/adapters/postal.adapter.js", () => ({
  getDispatchAdapter: () => ({
    getCapabilities: () => ({ providerName: "epost-oneapi" }),
    submit: mocks.adapterSubmit,
    checkStatus: mocks.adapterCheckStatus,
  }),
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

vi.mock("../src/modules/dispatch/dispatch-package.service.js", () => ({
  buildDispatchPackage: mocks.buildDispatchPackage,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchReconciliation: mocks.enqueueDispatchReconciliation,
}));

vi.mock("../src/modules/dispatch/dispatch-notifications.js", () => ({
  enqueueDispatchAcceptedEmail: mocks.enqueueDispatchAcceptedEmail,
  enqueueDispatchSubmittedEmail: mocks.enqueueDispatchSubmittedEmail,
}));

vi.mock("../src/workers/dispatch-settlement.js", () => ({
  settlePaymentForDispatchResolution: mocks.settlePaymentForDispatchResolution,
  canFinalizeDispatchResolution: mocks.canFinalizeDispatchResolution,
  updateDraftStatusForDispatchResolution: mocks.updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission: mocks.updateDraftStatusForDispatchSubmission,
}));

describe("dispatch workers", () => {
  beforeEach(() => {
    mocks.currentDb = createDbMock([[]]);
    mocks.createWorker.mockReset();
    mocks.emailQueueAdd.mockClear();
    mocks.createDispatchAttempt.mockReset();
    mocks.getDispatchAttemptByPaymentAttemptId.mockReset();
    mocks.getDispatchAttempt.mockReset();
    mocks.transitionDispatchState.mockReset();
    mocks.adapterSubmit.mockReset();
    mocks.adapterCheckStatus.mockReset();
    mocks.recordEvent.mockReset();
    mocks.buildDispatchPackage.mockReset();
    mocks.settlePaymentForDispatchResolution.mockReset();
    mocks.canFinalizeDispatchResolution.mockReset();
    mocks.updateDraftStatusForDispatchResolution.mockReset();
    mocks.updateDraftStatusForDispatchSubmission.mockReset();
    mocks.enqueueDispatchReconciliation.mockReset();
    mocks.enqueueDispatchAcceptedEmail.mockReset();
    mocks.enqueueDispatchSubmittedEmail.mockReset();
    mocks.acquireRedisLock.mockReset().mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
    });
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  it("defers synchronous settlement failures to reconciliation without terminalizing submit dispatch", async () => {
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-1" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-1",
      trackingNumber: null,
      providerPayload: { ok: true },
      failureReason: null,
    });
    mocks.settlePaymentForDispatchResolution.mockRejectedValue(
      new Error("stripe capture failed"),
    );

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-1",
        snapshotId: "snapshot-1",
        paymentId: "payment-1",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.transitionDispatchState.mock.calls.map(([, , state]) => state)).toEqual([
      "submitted",
    ]);
    expect(mocks.transitionDispatchState).toHaveBeenNthCalledWith(
      1,
      mocks.currentDb,
      "dispatch-1",
      "submitted",
      expect.not.objectContaining({
        providerPayload: expect.anything(),
      }),
    );
    expect(mocks.updateDraftStatusForDispatchSubmission).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-1",
      "submitted",
    );
    expect(mocks.enqueueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-1",
    });
    expect(mocks.enqueueDispatchAcceptedEmail).not.toHaveBeenCalled();
    expect(job.log).toHaveBeenCalledWith(
      "Dispatch settlement deferred for reconciliation: dispatch-1",
    );
  });

  it("does not resubmit when a dispatch attempt already exists for the payment", async () => {
    mocks.getDispatchAttemptByPaymentAttemptId.mockResolvedValue({
      id: "dispatch-existing",
      paymentAttemptId: "payment-duplicate",
      state: "submitted",
      providerReference: "provider-existing",
    });
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-new" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-new",
      trackingNumber: null,
      providerPayload: { ok: true },
      failureReason: null,
    });

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-duplicate",
        snapshotId: "snapshot-duplicate",
        paymentId: "payment-duplicate",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.createDispatchAttempt).not.toHaveBeenCalled();
    expect(mocks.adapterSubmit).not.toHaveBeenCalled();
  });

  it("finalizes synchronous rejected submissions through the resolution path instead of leaving the draft submitted", async () => {
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-2" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "registered" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "rejected",
      providerReference: "provider-2",
      trackingNumber: null,
      providerPayload: { ok: false },
      failureReason: "provider rejected",
    });
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({
      payment: { state: "cancelled" },
      rawOrderAccessToken: null,
    });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-2",
        snapshotId: "snapshot-2",
        paymentId: "payment-2",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.transitionDispatchState.mock.calls.map(([, , state]) => state)).toEqual([
      "submitted",
      "rejected",
    ]);
    expect(mocks.transitionDispatchState).toHaveBeenNthCalledWith(
      1,
      mocks.currentDb,
      "dispatch-2",
      "submitted",
      expect.not.objectContaining({
        providerPayload: expect.anything(),
      }),
    );
    expect(mocks.transitionDispatchState).toHaveBeenNthCalledWith(
      2,
      mocks.currentDb,
      "dispatch-2",
      "rejected",
      expect.not.objectContaining({
        providerPayload: expect.anything(),
      }),
    );
    expect(mocks.updateDraftStatusForDispatchResolution).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-2",
      "rejected",
      { state: "cancelled" },
    );
    expect(mocks.updateDraftStatusForDispatchSubmission).not.toHaveBeenCalled();
    expect(mocks.emailQueueAdd).not.toHaveBeenCalled();
  });

  it("queues dispatch-accepted with tracking when provider acceptance is immediate", async () => {
    mocks.currentDb = createDbMock([
      [{ sessionId: "session-3" }],
      [{ email: "user@example.com" }],
    ]);
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-2a" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "registered" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-2a",
      trackingNumber: "98.40.541881.00002354",
      providerPayload: { ok: true },
      failureReason: null,
    });
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({
      payment: {
        id: "payment-2a",
        draftId: "draft-2a",
        sessionId: "session-3",
        amountCents: 625,
        state: "captured",
      },
      rawOrderAccessToken: "order-token-2a",
    });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-2a",
        snapshotId: "snapshot-2a",
        paymentId: "payment-2a",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.enqueueDispatchSubmittedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dispatchAttemptId: "dispatch-2a",
        draftId: "draft-2a",
        paymentId: "payment-2a",
      }),
    );
    expect(mocks.enqueueDispatchAcceptedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dispatchAttemptId: "dispatch-2a",
        draftId: "draft-2a",
        paymentId: "payment-2a",
        providerReference: "provider-2a",
        trackingNumber: "98.40.541881.00002354",
      }),
    );
  });

  it("does not downgrade finalized acceptance when accepted-email enqueueing fails", async () => {
    mocks.currentDb = createDbMock([
      [{ sessionId: "session-accept-fail" }],
      [{ email: "user@example.com" }],
    ]);
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-accept-fail" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "registered" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-accept-fail",
      trackingNumber: "98.40.541881.00002354",
      providerPayload: { ok: true },
      failureReason: null,
    });
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({
      payment: {
        id: "payment-accept-fail",
        draftId: "draft-accept-fail",
        sessionId: "session-accept-fail",
        amountCents: 625,
        state: "captured",
      },
      rawOrderAccessToken: "order-token-accept-fail",
    });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);
    mocks.enqueueDispatchAcceptedEmail.mockRejectedValue(new Error("queue unavailable"));

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-accept-fail",
        snapshotId: "snapshot-accept-fail",
        paymentId: "payment-accept-fail",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.transitionDispatchState.mock.calls.map(([, , state]) => state)).toEqual([
      "submitted",
      "accepted",
    ]);
    expect(mocks.updateDraftStatusForDispatchResolution).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-accept-fail",
      "accepted",
      expect.objectContaining({ id: "payment-accept-fail" }),
    );
    expect(mocks.updateDraftStatusForDispatchSubmission).not.toHaveBeenCalled();
    expect(mocks.enqueueDispatchReconciliation).not.toHaveBeenCalled();
  });

  it("enqueues reconciliation after a non-terminal submission so provider confirmation can continue", async () => {
    mocks.currentDb = createDbMock([
      [{ sessionId: "session-queued" }],
      [{ email: "user@example.com" }],
    ]);
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-queued" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });
    mocks.adapterSubmit.mockResolvedValue({
      state: "submitted",
      providerReference: "provider-queued",
      trackingNumber: null,
      failureReason: null,
    });

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-queued",
        snapshotId: "snapshot-queued",
        paymentId: "payment-queued",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.enqueueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-queued",
    });
  });

  it("retries reconciliation when payment settlement fails before terminal dispatch state is written", async () => {
    mocks.currentDb = createDbMock([[]]);
    mocks.getDispatchAttempt.mockResolvedValue({
      id: "dispatch-3",
      draftId: "draft-3",
      paymentAttemptId: "payment-3",
      state: "submitted",
      providerReference: "provider-3",
    });
    mocks.adapterCheckStatus.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-3",
      trackingNumber: null,
      providerPayload: { status: "DELIVERED" },
      failureReason: null,
      checkedAt: new Date(),
    });
    mocks.settlePaymentForDispatchResolution.mockRejectedValue(
      new Error("stripe capture failed"),
    );

    const { processReconcileDispatchJob } =
      await import("../src/workers/reconcile-dispatch.worker.js");

    const job = {
      data: { dispatchAttemptId: "dispatch-3" },
      log: vi.fn(),
    };

    await expect(processReconcileDispatchJob(job as never)).rejects.toThrow(
      "stripe capture failed",
    );

    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
    expect(mocks.currentDb?.update).toHaveBeenCalledTimes(1);
  });

  it("skips reconciliation when another worker already holds the distributed lock", async () => {
    mocks.currentDb = createDbMock([[]]);
    mocks.acquireRedisLock.mockResolvedValueOnce(null);

    const { processReconcileDispatchJob } =
      await import("../src/workers/reconcile-dispatch.worker.js");

    const job = {
      data: { dispatchAttemptId: "dispatch-locked" },
      log: vi.fn(),
    };

    await expect(processReconcileDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.acquireRedisLock).toHaveBeenCalledWith(
      "dispatch-reconcile:dispatch-locked",
      expect.any(Number),
    );
    expect(mocks.getDispatchAttempt).not.toHaveBeenCalled();
    expect(mocks.adapterCheckStatus).not.toHaveBeenCalled();
  });

  it("updates draft state before terminal reconciliation writes the dispatch outcome", async () => {
    mocks.currentDb = createDbMock([[]]);
    mocks.getDispatchAttempt.mockResolvedValue({
      id: "dispatch-4",
      draftId: "draft-4",
      paymentAttemptId: "payment-4",
      state: "submitted",
      providerReference: "provider-4",
    });
    mocks.adapterCheckStatus.mockResolvedValue({
      state: "rejected",
      providerReference: "provider-4",
      trackingNumber: null,
      providerPayload: { status: "ERROR" },
      failureReason: "provider rejected",
      checkedAt: new Date(),
    });
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({
      payment: { state: "cancelled" },
      rawOrderAccessToken: null,
    });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);

    const { processReconcileDispatchJob } =
      await import("../src/workers/reconcile-dispatch.worker.js");

    const job = {
      data: { dispatchAttemptId: "dispatch-4" },
      log: vi.fn(),
    };

    await expect(processReconcileDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.updateDraftStatusForDispatchResolution).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-4",
      "rejected",
      { state: "cancelled" },
    );
    expect(
      mocks.updateDraftStatusForDispatchResolution.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.transitionDispatchState.mock.invocationCallOrder[0]);
    expect(mocks.transitionDispatchState.mock.calls.map(([, , state]) => state)).toEqual([
      "rejected",
    ]);
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      mocks.currentDb,
      "dispatch-4",
      "rejected",
      expect.not.objectContaining({
        providerPayload: expect.anything(),
      }),
    );
  });

  it("queues dispatch-accepted email when reconciliation settles acceptance", async () => {
    mocks.currentDb = createDbMock([[]]);
    mocks.getDispatchAttempt.mockResolvedValue({
      id: "dispatch-5",
      draftId: "draft-5",
      paymentAttemptId: "payment-5",
      state: "submitted",
      providerReference: "provider-5",
    });
    mocks.adapterCheckStatus.mockResolvedValue({
      state: "accepted",
      providerReference: "provider-5",
      trackingNumber: "track-5",
      providerPayload: { status: "DELIVERED" },
      failureReason: null,
      checkedAt: new Date(),
    });
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({
      payment: {
        id: "payment-5",
        draftId: "draft-5",
        sessionId: "session-5",
        amountCents: 625,
        state: "captured",
      },
      rawOrderAccessToken: "order-token-5",
    });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);

    const { processReconcileDispatchJob } =
      await import("../src/workers/reconcile-dispatch.worker.js");

    const job = {
      data: { dispatchAttemptId: "dispatch-5" },
      log: vi.fn(),
    };

    await expect(processReconcileDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.enqueueDispatchAcceptedEmail).toHaveBeenCalledWith(mocks.currentDb, {
      dispatchAttemptId: "dispatch-5",
      draftId: "draft-5",
      paymentId: "payment-5",
      providerReference: "provider-5",
      trackingNumber: "track-5",
    });
  });
});
