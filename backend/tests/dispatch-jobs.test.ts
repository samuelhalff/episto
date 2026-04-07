import { describe, it, expect, vi, beforeEach } from "vitest";

const add = vi.fn();

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    SUBMIT_DISPATCH: "submit-dispatch",
    RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
    CLEANUP_ASSETS: "cleanup-expired-assets",
    REFRESH_DISPATCH_RATES: "refresh-dispatch-rates",
  },
  getQueue: () => ({ add }),
}));

describe("dispatch job helpers", () => {
  beforeEach(() => {
    add.mockReset();
  });

  it("buildDispatchJobId derives a stable BullMQ id from the payment id", async () => {
    const { buildDispatchJobId } =
      await import("../src/modules/dispatch/dispatch.jobs.js");

    expect(buildDispatchJobId("pay_123")).toBe("dispatch:pay_123");
  });

  it("enqueueDispatchSubmission uses the payment-based job id for idempotency", async () => {
    const { enqueueDispatchSubmission } =
      await import("../src/modules/dispatch/dispatch.jobs.js");

    await enqueueDispatchSubmission({
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-1",
    });

    expect(add).toHaveBeenCalledWith(
      "submit-dispatch",
      {
        draftId: "draft-1",
        snapshotId: "snapshot-1",
        paymentId: "payment-1",
      },
      {
        jobId: "dispatch:payment-1",
      },
    );
  });

  it("enqueueDispatchReconciliation uses the dispatch-based job id for idempotency", async () => {
    const { enqueueDispatchReconciliation } =
      await import("../src/modules/dispatch/dispatch.jobs.js");

    await enqueueDispatchReconciliation({
      dispatchAttemptId: "dispatch-1",
    });

    expect(add).toHaveBeenCalledWith(
      "reconcile-dispatch",
      {
        dispatchAttemptId: "dispatch-1",
      },
      {
        jobId: "dispatch-reconcile:dispatch-1",
      },
    );
  });
});

