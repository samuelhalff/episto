import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    CONTENT_RETENTION_DAYS: 7,
    PDF_RETENTION_HOURS_POST_DISPATCH: 24,
    ATTACHMENT_RETENTION_HOURS_POST_DISPATCH: 24,
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

const deleteObjectMock = vi.fn().mockResolvedValue(undefined);
const listObjectsMock = vi.fn().mockResolvedValue([]);
const deleteObjectIfUnchangedMock = vi.fn().mockResolvedValue(true);
// The sweep re-reads every candidate before deleting it, so the default head
// answers with an object as old as the listing said and an identity to match.
const headObjectMock = vi
  .fn()
  .mockResolvedValue({ lastModified: new Date(0), eTag: '"orphan"' });

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  deleteObject: deleteObjectMock,
  listObjects: listObjectsMock,
  deleteObjectIfUnchanged: deleteObjectIfUnchangedMock,
  headObject: headObjectMock,
}));

// ---------------------------------------------------------------------------
// In-memory mock DB that tracks executed queries
// ---------------------------------------------------------------------------

// Draft-scoped retention first asks which drafts own matching assets and locks
// them, then retires the assets in a second command. Handing back a draft id
// is what lets the second command run at all, and so what keeps these
// SQL-shape assertions looking at the query that does the work.
function defaultExecute(query: unknown): Promise<{ rows: Array<{ id: string }> }> {
  if (sqlTextOf(query).includes("FROM draft_letters")) {
    return Promise.resolve({ rows: [{ id: "00000000-0000-0000-0000-000000000001" }] });
  }
  return Promise.resolve({ rows: [] });
}

const executeSpy = vi.fn().mockImplementation(defaultExecute);
const knownStorageKeys: string[] = [];

function createMockDb() {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };

  // `.where()` is both a chain step (.where().limit()) and a terminal the
  // orphan sweep awaits directly, so it has to be chainable and thenable.
  const whereResult: Record<string, unknown> = {
    limit: vi.fn().mockResolvedValue([]),
    then: (resolve: (rows: Array<{ storageKey: string }>) => unknown) =>
      resolve(knownStorageKeys.map((storageKey) => ({ storageKey }))),
  };
  // The pending-deletion queue is ordered so a repeatedly failing asset cannot
  // sit at the head of every run and starve everything behind it.
  whereResult.orderBy = vi.fn().mockReturnValue(whereResult);

  const db: Record<string, unknown> = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(whereResult),
      limit: whereResult.limit as () => unknown,
    }),
    update: vi.fn().mockReturnValue(updateChain),
    execute: executeSpy,
    _updateChain: updateChain,
  };

  // Every draft-scoped retention step now locks the drafts it is about to
  // touch and retires their assets in a second command, so it runs in a
  // transaction. The mock runs the callback against itself.
  db.transaction = (fn: (tx: unknown) => unknown) => fn(db);

  return db as typeof db & { _updateChain: typeof updateChain };
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
        extractedText: "file_assets.extracted_text",
      },
      dispatchAttempts: {
        id: "dispatch_attempts.id",
        draftId: "dispatch_attempts.draft_id",
        submittedAt: "dispatch_attempts.submitted_at",
      },
      // The ownership check consults receipts as well as file_assets: a receipt
      // PDF lives outside file_assets and must never be swept.
      receipts: {
        id: "receipts.id",
        storageKey: "receipts.storage_key",
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

/**
 * Recover the SQL text from a Drizzle `sql` template so a test can assert what
 * a step actually does, rather than that "an object" was passed.
 */
function sqlTextOf(value: unknown): string {
  const chunks = (value as { queryChunks?: unknown[] })?.queryChunks ?? [];
  return chunks
    .map((chunk) => {
      // A retention step composes its candidate predicate and its
      // queued-attempt guard in as nested `sql` fragments. Reading only the
      // top level recovers the UPDATE and drops exactly the two clauses these
      // tests exist to check.
      if ((chunk as { queryChunks?: unknown[] } | null)?.queryChunks) {
        return sqlTextOf(chunk);
      }
      const inner = (chunk as { value?: unknown } | null | undefined)?.value;
      return Array.isArray(inner) ? inner.join("") : "";
    })
    .join(" ");
}

async function runWorker(): Promise<string[]> {
  mockBullMqAndQueue();
  const { startCleanupAssetsWorker } =
    await import("../src/workers/cleanup-assets.worker.js");
  const worker = startCleanupAssetsWorker();
  const processor = (worker as { processor?: (job: unknown) => Promise<void> }).processor;
  executeSpy.mockClear();

  await assertDefined(
    processor,
    "Expected processor",
  )({
    data: { batchSize: 100 },
    log: vi.fn(),
  } as unknown as Parameters<typeof processor>[0]);

  return executeSpy.mock.calls.map((call) => sqlTextOf(call[0]));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cleanup-assets worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00Z"));
    executeSpy.mockImplementation(defaultExecute);
    listObjectsMock.mockResolvedValue([]);
    knownStorageKeys.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * The expired-session step used to select expired sessions, count them, and
   * do nothing — while logging a count that read like work had happened.
   * Sessions expire after 72h, so this is what collects an abandoned draft's
   * documents (docs/data-retention.md, F3).
   */
  it("retires the files of expired sessions instead of only counting them", async () => {
    const queries = await runWorker();
    // The step is two commands now — the one that does the work is the UPDATE.
    const expiredStep = queries.find(
      (q) => q.includes("UPDATE file_assets") && q.includes("expires_at"),
    );
    expect(expiredStep).toBeDefined();
    expect(expiredStep).toContain("UPDATE file_assets");
    expect(expiredStep).toContain("pending_deletion");
    expect(expiredStep).toContain("expires_at");
  });

  it("purges extracted text once the letter has been dispatched", async () => {
    const queries = await runWorker();
    const purgeStep = queries.find(
      (q) => q.includes("extracted_text = NULL") && q.includes("dispatch_attempts"),
    );
    expect(purgeStep).toBeDefined();
    expect(purgeStep).toContain("dispatch_attempts");
    expect(purgeStep).toContain("submitted_at");
  });

  it("retires dispatched attachments and signatures from the dispatch date", async () => {
    const queries = await runWorker();
    const step = queries.find(
      (q) =>
        q.includes("UPDATE file_assets") &&
        q.includes("'attachment'") &&
        q.includes("'signature'"),
    );
    expect(step).toBeDefined();
    expect(step).toContain("dispatch_attempts");
    expect(step).toContain("pending_deletion");
  });

  it("still sweeps undispatched content as a backstop", async () => {
    const queries = await runWorker();
    expect(queries.some((q) => q.includes("created_at <"))).toBe(true);
  });

  it("clears the extracted text when it deletes a file", async () => {
    mockBullMqAndQueue();
    const { getDb } = await import("../src/db/index.js");
    const db = getDb() as unknown as ReturnType<typeof createMockDb>;
    db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([{ id: "asset-1", storageKey: "attachments/s/asset-1" }]),
    } as never);

    await runWorker();

    expect(deleteObjectMock).toHaveBeenCalledWith("attachments/s/asset-1");
    expect(db._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "deleted", extractedText: null }),
    );
  });

  it("startCleanupAssetsWorker returns a defined worker", async () => {
    mockBullMqAndQueue();
    const { startCleanupAssetsWorker } =
      await import("../src/workers/cleanup-assets.worker.js");
    const worker = startCleanupAssetsWorker();
    expect(worker).toBeDefined();
    expect(worker.name).toBe("cleanup-expired-assets");
  });
});

/**
 * Everything else in the worker iterates `file_assets` rows, so an object with
 * no row is invisible to it and would be kept forever. Production had four
 * rendered letters and four signature images in exactly that state.
 */
describe("sweepOrphanedObjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listObjectsMock.mockResolvedValue([]);
    knownStorageKeys.length = 0;
  });

  async function sweep(graceMs: number): Promise<number> {
    const { sweepOrphanedObjects } =
      await import("../src/workers/cleanup-assets.worker.js");
    const { getDb } = await import("../src/db/index.js");
    return sweepOrphanedObjects(getDb() as never, graceMs);
  }

  it("deletes an object that no file_assets row points at", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "renders/"
          ? [{ key: "renders/draft-1/1.pdf", lastModified: new Date(0) }]
          : [],
      ),
    );

    expect(await sweep(1000)).toBe(1);
    expect(deleteObjectIfUnchangedMock).toHaveBeenCalledWith(
      "renders/draft-1/1.pdf",
      '"orphan"',
    );
  });

  it("keeps an object that is still tracked", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "attachments/"
          ? [{ key: "attachments/s/a-1", lastModified: new Date(0) }]
          : [],
      ),
    );
    knownStorageKeys.push("attachments/s/a-1");

    expect(await sweep(1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /** An upload writes the object first and the row second. */
  it("leaves a freshly written object alone so an upload in flight survives", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "attachments/"
          ? [{ key: "attachments/s/in-flight", lastModified: new Date() }]
          : [],
      ),
    );

    expect(await sweep(60 * 60 * 1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  it("never touches receipts, which are accounting records", async () => {
    await sweep(1000);
    const sweptPrefixes = listObjectsMock.mock.calls.map((call) => call[0]);
    expect(sweptPrefixes).not.toContain("receipts/");
  });

  /**
   * Every prefix the app writes user content to has to be reconciled, or that
   * whole class of object is retained forever with nothing pointing at it.
   * `signed-documents/` was written by the signing flow and swept by nothing.
   */
  it("reconciles every prefix that holds user content", async () => {
    await sweep(1000);
    const sweptPrefixes = listObjectsMock.mock.calls.map((call) => call[0]);

    expect(sweptPrefixes).toEqual(
      expect.arrayContaining([
        "attachments/",
        "signatures/",
        "renders/",
        "signed-documents/",
      ]),
    );
  });
});

/**
 * User stories for the retention guarantees the sweep and the worker owe the
 * user, each written as the promise it keeps rather than the query it runs.
 */
describe("retention guarantees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeSpy.mockImplementation(defaultExecute);
    listObjectsMock.mockResolvedValue([]);
    knownStorageKeys.length = 0;
  });

  async function sweep(graceMs: number): Promise<number> {
    const { sweepOrphanedObjects } =
      await import("../src/workers/cleanup-assets.worker.js");
    const { getDb } = await import("../src/db/index.js");
    return sweepOrphanedObjects(getDb() as never, graceMs);
  }

  /**
   * "My upload must not vanish." An object we cannot date could have been
   * written a second ago; treating an unknown timestamp as ancient would make
   * the grace window meaningless for exactly the objects we know least about.
   */
  it("never deletes an object whose age it cannot establish", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "attachments/"
          ? [{ key: "attachments/s/undated", lastModified: null }]
          : [],
      ),
    );

    expect(await sweep(1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * "Re-rendering my letter must not blank the PDF I'm looking at." Render keys
   * are deterministic (`renders/{draftId}/{version}.pdf`), so a re-render can
   * claim a key between the batch lookup and the delete.
   */
  it("re-checks ownership immediately before deleting", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "renders/"
          ? [{ key: "renders/draft-1/1.pdf", lastModified: new Date(0) }]
          : [],
      ),
    );
    const { getDb } = await import("../src/db/index.js");
    const db = getDb() as unknown as ReturnType<typeof createMockDb>;

    // Absent from the batch lookup…
    db.select.mockImplementationOnce(
      () =>
        ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        }) as never,
    );
    // …but a row claims the key by the time we are about to delete it.
    db.select.mockImplementationOnce(
      () =>
        ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ id: "asset-1" }]),
        }) as never,
    );

    expect(await sweep(1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * The ownership re-check is not enough on its own: the row is written after
   * the object, so a re-render that has uploaded but not yet inserted looks
   * exactly like an orphan. The listing is minutes old by the time we get here,
   * so the object is dated again immediately before deleting.
   */
  it("does not delete an object that was written to since the listing", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "renders/"
          ? [{ key: "renders/draft-1/1.pdf", lastModified: new Date(0) }]
          : [],
      ),
    );
    headObjectMock.mockResolvedValueOnce({ lastModified: new Date(), eTag: '"fresh"' });

    expect(await sweep(1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * And the last window — a write that lands after we dated the object — is
   * closed by the delete itself being conditional on that object's identity.
   */
  it("does not count an object rewritten after it was dated", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "renders/"
          ? [{ key: "renders/draft-1/1.pdf", lastModified: new Date(0) }]
          : [],
      ),
    );
    deleteObjectIfUnchangedMock.mockResolvedValueOnce(false);

    expect(await sweep(1000)).toBe(0);
  });

  /** No identity, no delete: we will not remove an object we cannot name. */
  it("does not delete an object storage will not identify", async () => {
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(
        prefix === "renders/"
          ? [{ key: "renders/draft-1/1.pdf", lastModified: new Date(0) }]
          : [],
      ),
    );
    headObjectMock.mockResolvedValueOnce({ lastModified: new Date(0), eTag: null });

    expect(await sweep(1000)).toBe(0);
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * "Cleanup must not stop working once the bucket gets big." One `IN (...)`
   * per candidate list would eventually exceed the parameter limit and take the
   * whole sweep down with it.
   */
  it("looks up candidates in bounded batches", async () => {
    const objects = Array.from({ length: 450 }, (_, i) => ({
      key: `attachments/s/file-${i}`,
      lastModified: new Date(0),
    }));
    listObjectsMock.mockImplementation((prefix: string) =>
      Promise.resolve(prefix === "attachments/" ? objects : []),
    );
    const { getDb } = await import("../src/db/index.js");
    const db = getDb() as unknown as ReturnType<typeof createMockDb>;

    await sweep(1000);

    // 450 candidates → 3 batch lookups of at most 200 keys, plus one ownership
    // re-check per orphan before it is deleted.
    expect(db.select.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * "Don't shred the enclosures for a letter that hasn't gone out." A draft can
   * have several dispatch attempts; an old submitted one must not retire the
   * documents a newer, still-queued one needs.
   */
  it("keeps dispatched content while another attempt is still unsubmitted", async () => {
    const queries = await runWorker();
    const step = queries.find(
      (q) =>
        q.includes("UPDATE file_assets") &&
        q.includes("'attachment'") &&
        q.includes("'signature'"),
    );
    expect(step).toContain("NOT EXISTS");
    expect(step).toContain("submitted_at IS NULL");
  });

  /**
   * "A file I deleted last month must not still be readable." Before the row
   * cleared its own text on deletion, `deleted` rows kept up to 12,000
   * characters of the document indefinitely — those rows are still out there.
   */
  it("purges extracted text left behind on already-deleted rows", async () => {
    const queries = await runWorker();
    const purge = queries.find((q) => q.includes("extracted_text = NULL"));
    expect(purge).toContain("'deleted'");
  });

  /**
   * "My letter failed to go out and is being retried — don't throw away what
   * you read out of my contract." The text purge asked only whether *some*
   * attempt had been submitted, so an old submitted attempt erased the context
   * a newer, still-queued retry needs to redraft the letter. It now carries the
   * same guard as the object-retirement steps.
   */
  it("keeps extracted text while a dispatch retry is still queued", async () => {
    const queries = await runWorker();
    const purge = queries.find(
      (q) => q.includes("extracted_text = NULL") && q.includes("dispatch_attempts"),
    );

    expect(purge).toContain("NOT EXISTS");
    expect(purge).toContain("da.submitted_at IS NULL");
  });

  /**
   * "One broken file must not stop everyone else's cleanup." The worker takes
   * the first N pending rows each run, so a permanently failing asset used to
   * sit at the head of every batch forever.
   */
  it("records a failed deletion so the asset rotates to the back of the queue", async () => {
    mockBullMqAndQueue();
    const { getDb } = await import("../src/db/index.js");
    const db = getDb() as unknown as ReturnType<typeof createMockDb>;
    db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([{ id: "asset-1", storageKey: "attachments/s/asset-1" }]),
    } as never);
    deleteObjectMock.mockRejectedValueOnce(new Error("storage down"));

    await runWorker();

    expect(db._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ deletionFailedAt: expect.any(Date) }),
    );
  });
});
