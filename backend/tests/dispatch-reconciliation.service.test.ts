import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDispatchAttempt: vi.fn(),
  getDispatchAdapter: vi.fn(),
  acquireRedisLock: vi.fn(),
  transitionDispatchState: vi.fn(),
  settlePaymentForDispatchResolution: vi.fn(),
  canFinalizeDispatchResolution: vi.fn(),
  updateDraftStatusForDispatchResolution: vi.fn(),
  enqueueDispatchAcceptedEmail: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  schema: { dispatchAttempts: { id: "dispatch_id" } },
}));
vi.mock("../src/shared/redis-lock.js", () => ({
  acquireRedisLock: mocks.acquireRedisLock,
}));
vi.mock("../src/modules/dispatch/dispatch.service.js", () => ({
  getDispatchAttempt: mocks.getDispatchAttempt,
  transitionDispatchState: mocks.transitionDispatchState,
}));
vi.mock("../src/modules/dispatch/adapters/postal.adapter.js", () => ({
  getDispatchAdapter: mocks.getDispatchAdapter,
}));
vi.mock("../src/workers/dispatch-settlement.js", () => ({
  settlePaymentForDispatchResolution: mocks.settlePaymentForDispatchResolution,
  canFinalizeDispatchResolution: mocks.canFinalizeDispatchResolution,
  updateDraftStatusForDispatchResolution: mocks.updateDraftStatusForDispatchResolution,
}));
vi.mock("../src/modules/dispatch/dispatch-notifications.js", () => ({
  enqueueDispatchAcceptedEmail: mocks.enqueueDispatchAcceptedEmail,
}));

function dbMock() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  return { update: vi.fn(() => ({ set })), where } as never;
}

describe("dispatch reconciliation service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.acquireRedisLock.mockResolvedValue({ release: vi.fn() });
    mocks.getDispatchAdapter.mockReturnValue({
      checkStatus: vi.fn(),
      findDeliveryByApplicationIdentifiers: vi.fn().mockResolvedValue(null),
    });
  });

  it("records a provider acceptance conflict without reopening a rejected dispatch", async () => {
    const adapter = mocks.getDispatchAdapter();
    adapter.checkStatus.mockResolvedValue({
      state: "accepted",
      providerReference: "8",
      trackingNumber: "TRK-8",
      providerErrorCode: null,
      failureReason: null,
    });
    mocks.getDispatchAttempt.mockResolvedValue({
      id: "dispatch-1",
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentAttemptId: "payment-1",
      state: "rejected",
      providerReference: "8",
      trackingNumber: null,
    });

    const { reconcileDispatch } =
      await import("../src/modules/dispatch/dispatch-reconciliation.service.js");
    const result = await reconcileDispatch(dbMock(), "dispatch-1");

    expect(result.conflict).toBe(true);
    expect(result.state).toBe("rejected");
    expect(mocks.settlePaymentForDispatchResolution).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
  });

  it("discovers an exact provider reference before checking an ambiguous attempt", async () => {
    const adapter = mocks.getDispatchAdapter();
    adapter.findDeliveryByApplicationIdentifiers.mockResolvedValue({
      providerReference: "8",
    });
    adapter.checkStatus.mockResolvedValue({
      state: "rejected",
      providerReference: "8",
      trackingNumber: null,
      providerErrorCode: "PHYSICAL_DELIVERY_FAILED",
      failureReason: "Could not deliver physically",
    });
    mocks.getDispatchAttempt.mockResolvedValue({
      id: "dispatch-2",
      draftId: "draft-2",
      snapshotId: "snapshot-2",
      paymentAttemptId: "payment-2",
      state: "unknown",
      providerReference: null,
      trackingNumber: null,
    });
    const payment = { id: "payment-2", state: "refunded" };
    mocks.settlePaymentForDispatchResolution.mockResolvedValue({ payment });
    mocks.canFinalizeDispatchResolution.mockReturnValue(true);

    const { reconcileDispatch } =
      await import("../src/modules/dispatch/dispatch-reconciliation.service.js");
    const result = await reconcileDispatch(dbMock(), "dispatch-2");

    expect(adapter.findDeliveryByApplicationIdentifiers).toHaveBeenCalledWith(
      "draft-2",
      "snapshot-2",
    );
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      expect.anything(),
      "dispatch-2",
      "rejected",
      expect.objectContaining({ providerReference: "8" }),
    );
    expect(result.providerDiagnostics?.providerErrorCode).toBe(
      "PHYSICAL_DELIVERY_FAILED",
    );
  });
});
