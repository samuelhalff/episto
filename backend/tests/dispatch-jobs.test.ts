import { describe, it, expect, vi, beforeEach } from "vitest";

const add = vi.fn();

// Mock at the BullMQ level so the real queue/index module runs (including
// registerScheduledJobs) while Queue.add is intercepted by the spy.
vi.mock("bullmq", () => {
  class MockQueue {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    add(...args: unknown[]) {
      return add(...args);
    }
    close() {
      return Promise.resolve();
    }
  }
  class MockWorker {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    close() {
      return Promise.resolve();
    }
  }
  return { Queue: MockQueue, Worker: MockWorker };
});

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    REDIS_URL: "redis://localhost:6379",
    DISPATCH_RATE_MATRIX_REFRESH_CRON: "5 6 * * *",
  }),
}));

describe("dispatch job helpers", () => {
  beforeEach(() => {
    add.mockReset();
  });

  it("buildDispatchJobId derives a stable BullMQ id from the payment id", async () => {
    const { buildDispatchJobId } =
      await import("../src/modules/dispatch/dispatch.jobs.js");

    expect(buildDispatchJobId("pay_123")).toBe("dispatch-pay_123");
    expect(buildDispatchJobId("pay_123")).not.toContain(":");
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
        jobId: "dispatch-payment-1",
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
        jobId: "dispatch-reconcile-dispatch-1",
      },
    );
  });

  it("registers the configured daily pricing refresh sentinel job", async () => {
    const { registerScheduledJobs } = await import("../src/queue/index.js");

    await registerScheduledJobs();

    expect(add).toHaveBeenCalledWith(
      "scheduled-rate-refresh-sentinel",
      { reason: "stale_matrix" },
      expect.objectContaining({
        jobId: "scheduled-rate-refresh-sentinel",
        repeat: { pattern: "5 6 * * *" },
      }),
    );
  });
});
