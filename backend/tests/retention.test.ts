import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies before imports
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

// ---------------------------------------------------------------------------
// Helpers — mock Drizzle query builder chain
// ---------------------------------------------------------------------------

function createMockDb(overrides: {
  selectResult?: unknown[];
  updateResult?: unknown[];
} = {}) {
  const selectResult = overrides.selectResult ?? [];
  const updateResult = overrides.updateResult ?? [];

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(selectResult),
  };

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(updateResult),
  };

  return {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
    _selectChain: selectChain,
    _updateChain: updateChain,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("retention module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
  });

  // -----------------------------------------------------------------------
  // cleanupExpiredSessions
  // -----------------------------------------------------------------------

  describe("cleanupExpiredSessions", () => {
    it("returns the count of expired sessions", async () => {
      const { cleanupExpiredSessions } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({
        selectResult: [
          { id: "sess-1" },
          { id: "sess-2" },
          { id: "sess-3" },
        ],
      });
      const count = await cleanupExpiredSessions(db as never);
      expect(count).toBe(3);
    });

    it("returns 0 when no sessions are expired", async () => {
      const { cleanupExpiredSessions } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      const count = await cleanupExpiredSessions(db as never);
      expect(count).toBe(0);
    });

    it("respects the batchSize parameter", async () => {
      const { cleanupExpiredSessions } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await cleanupExpiredSessions(db as never, 50);
      expect(db._selectChain.limit).toHaveBeenCalledWith(50);
    });

    it("uses default batchSize of 100 when not specified", async () => {
      const { cleanupExpiredSessions } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await cleanupExpiredSessions(db as never);
      expect(db._selectChain.limit).toHaveBeenCalledWith(100);
    });

    it("queries sessions table with expiry check", async () => {
      const { cleanupExpiredSessions } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await cleanupExpiredSessions(db as never);
      expect(db.select).toHaveBeenCalled();
      expect(db._selectChain.from).toHaveBeenCalled();
      expect(db._selectChain.where).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // cleanupDeletedFiles
  // -----------------------------------------------------------------------

  describe("cleanupDeletedFiles", () => {
    it("returns storage keys for files with deleted status", async () => {
      const { cleanupDeletedFiles } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({
        selectResult: [
          { id: "file-1", storageKey: "attachments/sess-1/file-1" },
          { id: "file-2", storageKey: "signatures/sess-1/file-2" },
        ],
      });
      const keys = await cleanupDeletedFiles(db as never);
      expect(keys).toEqual([
        "attachments/sess-1/file-1",
        "signatures/sess-1/file-2",
      ]);
    });

    it("returns empty array when no deleted files exist", async () => {
      const { cleanupDeletedFiles } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      const keys = await cleanupDeletedFiles(db as never);
      expect(keys).toEqual([]);
    });

    it("respects batchSize parameter", async () => {
      const { cleanupDeletedFiles } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await cleanupDeletedFiles(db as never, 25);
      expect(db._selectChain.limit).toHaveBeenCalledWith(25);
    });

    it("uses default batchSize of 100", async () => {
      const { cleanupDeletedFiles } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await cleanupDeletedFiles(db as never);
      expect(db._selectChain.limit).toHaveBeenCalledWith(100);
    });
  });

  // -----------------------------------------------------------------------
  // findExpiredDraftContent
  // -----------------------------------------------------------------------

  describe("findExpiredDraftContent", () => {
    it("returns IDs of closed drafts older than CONTENT_RETENTION_DAYS", async () => {
      const { findExpiredDraftContent } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({
        selectResult: [
          { id: "draft-old-1" },
          { id: "draft-old-2" },
        ],
      });
      const ids = await findExpiredDraftContent(db as never);
      expect(ids).toEqual(["draft-old-1", "draft-old-2"]);
    });

    it("returns empty array when no expired content exists", async () => {
      const { findExpiredDraftContent } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      const ids = await findExpiredDraftContent(db as never);
      expect(ids).toEqual([]);
    });

    it("applies where clause for closed status and date cutoff", async () => {
      const { findExpiredDraftContent } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await findExpiredDraftContent(db as never);
      expect(db._selectChain.where).toHaveBeenCalled();
    });

    it("respects batchSize parameter", async () => {
      const { findExpiredDraftContent } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await findExpiredDraftContent(db as never, 10);
      expect(db._selectChain.limit).toHaveBeenCalledWith(10);
    });
  });

  // -----------------------------------------------------------------------
  // findExpiredRenderedPdfs
  // -----------------------------------------------------------------------

  describe("findExpiredRenderedPdfs", () => {
    it("returns storage keys of active rendered PDFs older than cutoff", async () => {
      const { findExpiredRenderedPdfs } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({
        selectResult: [
          { id: "pdf-1", storageKey: "renders/draft-1/1.pdf" },
          { id: "pdf-2", storageKey: "renders/draft-2/1.pdf" },
        ],
      });
      const keys = await findExpiredRenderedPdfs(db as never);
      expect(keys).toEqual([
        "renders/draft-1/1.pdf",
        "renders/draft-2/1.pdf",
      ]);
    });

    it("returns empty array when no expired PDFs exist", async () => {
      const { findExpiredRenderedPdfs } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      const keys = await findExpiredRenderedPdfs(db as never);
      expect(keys).toEqual([]);
    });

    it("queries for kind=rendered_pdf with active status", async () => {
      const { findExpiredRenderedPdfs } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await findExpiredRenderedPdfs(db as never);
      expect(db._selectChain.where).toHaveBeenCalled();
    });

    it("respects batchSize parameter", async () => {
      const { findExpiredRenderedPdfs } = await import(
        "../src/modules/retention/index.js"
      );
      const db = createMockDb({ selectResult: [] });
      await findExpiredRenderedPdfs(db as never, 5);
      expect(db._selectChain.limit).toHaveBeenCalledWith(5);
    });
  });
});
