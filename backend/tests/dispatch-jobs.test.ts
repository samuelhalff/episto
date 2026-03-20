import { describe, it, expect, vi, beforeEach } from "vitest";

const add = vi.fn();

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    SUBMIT_DISPATCH: "submit-dispatch",
  },
  getQueue: () => ({ add }),
}));

describe("dispatch job helpers", () => {
  beforeEach(() => {
    add.mockReset();
  });

  it("buildDispatchJobId derives a stable BullMQ id from the payment id", async () => {
    const { buildDispatchJobId } = await import(
      "../src/modules/dispatch/dispatch.jobs.js"
    );

    expect(buildDispatchJobId("pay_123")).toBe("dispatch:pay_123");
  });

  it("enqueueDispatchSubmission uses the payment-based job id for idempotency", async () => {
    const { enqueueDispatchSubmission } = await import(
      "../src/modules/dispatch/dispatch.jobs.js"
    );

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
});
