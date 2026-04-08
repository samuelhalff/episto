import { describe, it, expect, vi, beforeEach } from "vitest";
import { QUEUE_NAMES, registerScheduledJobs } from "../src/queue/index.js";

// Track mock queue add calls for assertion
const addSpy = vi.fn().mockResolvedValue({ id: "mock-job-id" });

// Mock BullMQ — workers require Redis in real use
vi.mock("bullmq", () => {
  class MockWorker {
    name: string;
    processor: unknown;
    opts: unknown;
    constructor(name: string, processor: unknown, opts: unknown) {
      this.name = name;
      this.processor = processor;
      this.opts = opts;
    }
    on() {
      return this;
    }
    close() {
      return Promise.resolve();
    }
  }
  class MockQueue {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    add(...args: unknown[]) {
      return addSpy(...args);
    }
    close() {
      return Promise.resolve();
    }
  }
  return { Worker: MockWorker, Queue: MockQueue };
});

// Mock external dependencies
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    REDIS_URL: "redis://localhost:6379",
    DATABASE_URL: "postgresql://localhost/test",
    CONTENT_RETENTION_DAYS: 7,
    DISPATCH_RATE_MATRIX_REFRESH_CRON: "5 6 * * *",
  }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("queue names", () => {
  it("defines all 6 required queue names", () => {
    expect(QUEUE_NAMES.RENDER_PDF).toBe("render-pdf");
    expect(QUEUE_NAMES.SUBMIT_DISPATCH).toBe("submit-dispatch");
    expect(QUEUE_NAMES.RECONCILE_DISPATCH).toBe("reconcile-ambiguous-dispatch");
    expect(QUEUE_NAMES.SEND_EMAIL).toBe("send-transactional-email");
    expect(QUEUE_NAMES.CLEANUP_ASSETS).toBe("cleanup-expired-assets");
    expect(QUEUE_NAMES.REFRESH_DISPATCH_RATES).toBe("refresh-dispatch-rates");
  });

  it("has exactly 6 queue names", () => {
    expect(Object.keys(QUEUE_NAMES)).toHaveLength(6);
  });
});

describe("worker factories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("startEmailWorker returns a worker for SEND_EMAIL queue", async () => {
    const { startEmailWorker } = await import(
      "../src/workers/email.worker.js"
    );
    const worker = startEmailWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.SEND_EMAIL);
  });

  it("startRenderPdfWorker returns a worker for RENDER_PDF queue", async () => {
    const { startRenderPdfWorker } = await import(
      "../src/workers/render-pdf.worker.js"
    );
    const worker = startRenderPdfWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.RENDER_PDF);
  });

  it("startSubmitDispatchWorker returns a worker for SUBMIT_DISPATCH queue", async () => {
    const { startSubmitDispatchWorker } = await import(
      "../src/workers/submit-dispatch.worker.js"
    );
    const worker = startSubmitDispatchWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.SUBMIT_DISPATCH);
  });

  it("startReconcileDispatchWorker returns a worker for RECONCILE_DISPATCH queue", async () => {
    const { startReconcileDispatchWorker } = await import(
      "../src/workers/reconcile-dispatch.worker.js"
    );
    const worker = startReconcileDispatchWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.RECONCILE_DISPATCH);
  });

  it("startCleanupAssetsWorker returns a worker for CLEANUP_ASSETS queue", async () => {
    const { startCleanupAssetsWorker } = await import(
      "../src/workers/cleanup-assets.worker.js"
    );
    const worker = startCleanupAssetsWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.CLEANUP_ASSETS);
  });

  it("startRefreshDispatchRatesWorker returns a worker for REFRESH_DISPATCH_RATES queue", async () => {
    const { startRefreshDispatchRatesWorker } = await import(
      "../src/workers/refresh-dispatch-rates.worker.js"
    );
    const worker = startRefreshDispatchRatesWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe(QUEUE_NAMES.REFRESH_DISPATCH_RATES);
    await worker.close();
  });
});

describe("startWorkers orchestrator", () => {
  it("starts all 6 workers", async () => {
    const { startWorkers, stopWorkers } = await import(
      "../src/workers/index.js"
    );
    // Should not throw
    startWorkers();
    await stopWorkers();
  });
});

describe("registerScheduledJobs", () => {
  beforeEach(() => {
    addSpy.mockClear();
  });

  it("registers a repeatable cleanup job with hourly cron pattern", async () => {
    await registerScheduledJobs();
    expect(addSpy).toHaveBeenCalledWith(
      "scheduled-cleanup",
      { batchSize: 100 },
      expect.objectContaining({
        repeat: { pattern: "0 * * * *" },
        jobId: "scheduled-cleanup",
      }),
    );
  });

  it("registers a repeatable pricing refresh job with the configured cron pattern", async () => {
    await registerScheduledJobs();
    expect(addSpy).toHaveBeenCalledWith(
      "scheduled-rate-refresh-sentinel",
      { reason: "stale_matrix" },
      expect.objectContaining({
        repeat: { pattern: "5 6 * * *" },
        jobId: "scheduled-rate-refresh-sentinel",
      }),
    );
  });

  it("is idempotent — safe to call multiple times", async () => {
    addSpy.mockClear();
    await registerScheduledJobs();
    await registerScheduledJobs();
    // BullMQ deduplicates by jobId; we verify no errors thrown
    expect(addSpy).toHaveBeenCalledTimes(4); // 2 jobs × 2 calls
  });
});
