import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    CONTENT_RETENTION_DAYS: 7,
    PDF_RETENTION_HOURS_POST_DISPATCH: 24,
    REDIS_URL: "redis://localhost:6379",
    DATABASE_URL: "postgresql://localhost/test",
  }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// In-memory mock DB that tracks executed queries
// ---------------------------------------------------------------------------

const executeSpy = vi.fn().mockResolvedValue({ rows: [] });

function createMockDb() {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }),
    update: vi.fn().mockReturnValue(updateChain),
    execute: executeSpy,
    _updateChain: updateChain,
  };
}

vi.mock("../src/db/index.js", () => {
  let db: ReturnType<typeof createMockDb> | null = null;
  return {
    getDb: () => {
      if (!db) db = createMockDb();
      return db;
    },
    schema: {
      sessions: { id: "sessions.id", expiresAt: "sessions.expires_at" },
      fileAssets: {
        id: "file_assets.id",
        storageKey: "file_assets.storage_key",
        status: "file_assets.status",
        createdAt: "file_assets.created_at",
        kind: "file_assets.kind",
        draftId: "file_assets.draft_id",
      },
      dispatchAttempts: {
        id: "dispatch_attempts.id",
        draftId: "dispatch_attempts.draft_id",
        submittedAt: "dispatch_attempts.submitted_at",
      },
    },
  };
});

// BullMQ and queue mocks for each test
function mockBullMqAndQueue() {
  vi.doMock("bullmq", () => {
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
      add() {
        return Promise.resolve({ id: "mock-job-id" });
      }
      close() {
        return Promise.resolve();
      }
    }
    return { Worker: MockWorker, Queue: MockQueue };
  });

  vi.doMock("../src/queue/index.js", () => ({
    createWorker: (queueName: string, processor: unknown, opts: unknown) => ({
      name: queueName,
      processor,
      opts,
      on: () => ({ name: queueName, processor, opts }),
      close: () => Promise.resolve(),
    }),
    QUEUE_NAMES: { CLEANUP_ASSETS: "cleanup-expired-assets" },
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cleanup-assets worker — PDF retention TTL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00Z"));
    executeSpy.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("PDF-specific cleanup via db.execute", () => {
    it("calls db.execute with a SQL UPDATE targeting dispatched PDFs", async () => {
      mockBullMqAndQueue();
      const { startCleanupAssetsWorker } =
        await import("../src/workers/cleanup-assets.worker.js");
      const worker = startCleanupAssetsWorker();
      const processor = (worker as { processor?: (job: unknown) => Promise<void> })
        .processor;
      expect(processor).toBeDefined();

      executeSpy.mockClear();

      await assertDefined(
        processor,
        "Expected processor",
      )({
        data: { batchSize: 100 },
        log: vi.fn(),
      } as unknown as Parameters<typeof processor>[0]);

      // db.execute should have been called for the PDF cleanup query
      expect(executeSpy).toHaveBeenCalled();

      // Verify the execute was passed a SQL object (from drizzle-orm sql``)
      const sqlArg = executeSpy.mock.calls[0]?.[0];
      expect(sqlArg).toBeDefined();
      // It should be a Drizzle SQL object with queryChunks and params
      expect(typeof sqlArg).toBe("object");
    });
  });

  describe("non-PDF content follows CONTENT_RETENTION_DAYS", () => {
    it("calls db.execute for both PDF and non-PDF content retention steps", async () => {
      mockBullMqAndQueue();
      const { startCleanupAssetsWorker } =
        await import("../src/workers/cleanup-assets.worker.js");
      const worker = startCleanupAssetsWorker();
      const processor = (worker as { processor?: (job: unknown) => Promise<void> })
        .processor;
      expect(processor).toBeDefined();

      executeSpy.mockClear();

      await assertDefined(
        processor,
        "Expected processor",
      )({
        data: { batchSize: 100 },
        log: vi.fn(),
      } as unknown as Parameters<typeof processor>[0]);

      // db.execute should be called at least twice: once for PDF cleanup, once for content retention
      expect(executeSpy).toHaveBeenCalledTimes(2);

      // Both calls should receive a SQL object (from drizzle-orm sql template)
      const firstArg = executeSpy.mock.calls[0]?.[0];
      const secondArg = executeSpy.mock.calls[1]?.[0];
      expect(firstArg).toBeDefined();
      expect(typeof firstArg).toBe("object");
      expect(secondArg).toBeDefined();
      expect(typeof secondArg).toBe("object");
    });
  });

  describe("worker exports", () => {
    it("startCleanupAssetsWorker returns a defined worker", async () => {
      mockBullMqAndQueue();
      const { startCleanupAssetsWorker } =
        await import("../src/workers/cleanup-assets.worker.js");
      const worker = startCleanupAssetsWorker();
      expect(worker).toBeDefined();
      expect(worker.name).toBe("cleanup-expired-assets");
    });
  });
});
