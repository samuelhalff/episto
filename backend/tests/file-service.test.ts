import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/dispatch/adapters/postal.adapter.js", () => ({
  getDispatchAdapter: () => ({
    getCapabilities: () => ({
      attachmentPolicy: {
        maxAttachmentsPerDraft: 5,
        allowedMimeTypes: ["application/pdf"],
      },
    }),
  }),
}));

const { deleteObjectMock, deleteObjectIfUnchangedMock, headObjectMock } = vi.hoisted(
  () => ({
    deleteObjectMock: vi.fn().mockResolvedValue(undefined),
    deleteObjectIfUnchangedMock: vi.fn().mockResolvedValue(true),
    headObjectMock: vi.fn().mockResolvedValue({ lastModified: new Date(0), eTag: '"a"' }),
  }),
);

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  deleteObject: deleteObjectMock,
  deleteObjectIfUnchanged: deleteObjectIfUnchangedMock,
  headObject: headObjectMock,
}));

import {
  assertUploadMimeMatchesContent,
  attachmentStorageKey,
  createFileAsset,
  deleteFileAsset,
  signatureStorageKey,
  renderStorageKey,
  withOrphanCleanup,
} from "../src/modules/files/file.service.js";

describe("Storage key generation", () => {
  describe("attachmentStorageKey", () => {
    it("follows attachments/{sessionId}/{fileId} pattern", () => {
      const key = attachmentStorageKey("sess-123", "file-456");
      expect(key).toBe("attachments/sess-123/file-456");
    });

    it("handles UUID-style IDs", () => {
      const key = attachmentStorageKey(
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
      );
      expect(key).toBe(
        "attachments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321",
      );
    });
  });

  describe("signatureStorageKey", () => {
    it("follows signatures/{sessionId}/{fileId} pattern", () => {
      const key = signatureStorageKey("sess-123", "file-789");
      expect(key).toBe("signatures/sess-123/file-789");
    });
  });

  describe("renderStorageKey", () => {
    it("follows renders/{draftId}/{version}.pdf pattern", () => {
      const key = renderStorageKey("draft-abc", 1);
      expect(key).toBe("renders/draft-abc/1.pdf");
    });

    it("works with multi-digit version numbers", () => {
      const key = renderStorageKey("draft-xyz", 42);
      expect(key).toBe("renders/draft-xyz/42.pdf");
    });
  });

  describe("assertUploadMimeMatchesContent", () => {
    it("accepts PDF uploads when the content matches the declared MIME type", () => {
      expect(() =>
        assertUploadMimeMatchesContent(
          "attachment",
          "application/pdf",
          Buffer.from("%PDF-1.7\nhello"),
        ),
      ).not.toThrow();
    });

    it("rejects spoofed PDF uploads when the file bytes do not match the MIME type", () => {
      expect(() =>
        assertUploadMimeMatchesContent(
          "attachment",
          "application/pdf",
          Buffer.from("not-a-real-pdf"),
        ),
      ).toThrow("File content does not match the declared MIME type");
    });
  });

  describe("createFileAsset", () => {
    it("enforces attachment limits using the counted attachment total", async () => {
      const selectChain: Record<string, unknown> = {};
      selectChain.from = vi.fn().mockReturnValue(selectChain);
      selectChain.where = vi.fn().mockResolvedValue([{ total: 5 }]);

      const returning = vi.fn().mockResolvedValue([
        {
          id: "file-1",
        },
      ]);
      const values = vi.fn().mockReturnValue({ returning });
      const insert = vi.fn().mockReturnValue({ values });
      const db = {
        select: vi.fn().mockReturnValue(selectChain),
        insert,
      };

      await expect(
        createFileAsset(db as never, {
          sessionId: "11111111-1111-4111-8111-111111111111",
          draftId: "22222222-2222-4222-8222-222222222222",
          kind: "attachment",
          storageKey: "attachments/session/file",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        }),
      ).rejects.toMatchObject({
        code: "ATTACHMENT_LIMIT_REACHED",
      });

      expect(insert).not.toHaveBeenCalled();
    });
  });
});

/**
 * An upload writes the object first and the row second, so a failure in
 * between leaves an object nothing points at. Retention iterates rows, so such
 * an object is invisible to it and would be kept forever — which is how four
 * rendered letters and four signature images leaked into production storage
 * (docs/data-retention.md, F2).
 */
describe("withOrphanCleanup", () => {
  const silentLogger = { warn: vi.fn() };

  // "Did we delete anything?" is the whole assertion here, so each case needs a
  // clean count rather than one inherited from the case before it.
  beforeEach(() => {
    deleteObjectMock.mockClear();
    silentLogger.warn.mockClear();
    deleteObjectIfUnchangedMock.mockClear();
    deleteObjectIfUnchangedMock.mockResolvedValue(true);
    headObjectMock.mockClear();
    headObjectMock.mockResolvedValue({ lastModified: new Date(0), eTag: '"a"' });
  });

  /**
   * `isStorageKeyOwned` asks `file_assets` first and `receipts` second, so a
   * db stub answers with one result per lookup.
   */
  function dbWithOwners(...lookups: unknown[][]) {
    let call = 0;
    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => lookups[call++] ?? [],
          }),
        }),
      }),
    } as never;
  }

  const ownedByNobody = () => dbWithOwners([], []);

  it("leaves the object in place when registration succeeds", async () => {
    await withOrphanCleanup(
      ownedByNobody(),
      "attachments/s/f",
      silentLogger,
      async () => "ok",
    );
    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  it("deletes the object when registration fails, and still reports the failure", async () => {
    await expect(
      withOrphanCleanup(ownedByNobody(), "attachments/s/f", silentLogger, async () => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");

    expect(deleteObjectIfUnchangedMock).toHaveBeenCalledWith("attachments/s/f", '"a"');
  });

  /**
   * The window this closes: our upload is overwritten by another writer between
   * the ownership check and the delete. The object is no longer the orphan we
   * decided to remove, so the conditional delete fails and we leave it alone.
   */
  it("leaves an object that was rewritten under it", async () => {
    deleteObjectIfUnchangedMock.mockResolvedValue(false);

    await expect(
      withOrphanCleanup(
        ownedByNobody(),
        "renders/draft-1/1.pdf",
        silentLogger,
        async () => {
          throw new Error("insert failed");
        },
      ),
    ).rejects.toThrow("insert failed");

    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "changed" }),
      expect.any(String),
    );
  });

  it("reports the original failure even when the cleanup itself fails", async () => {
    deleteObjectIfUnchangedMock.mockRejectedValueOnce(new Error("storage down"));

    await expect(
      withOrphanCleanup(ownedByNobody(), "attachments/s/f", silentLogger, async () => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");
  });

  /**
   * User story: "I clicked preview twice." Render keys are deterministic
   * (`renders/{draftId}/{version}.pdf`) and `storage_key` is unique, so the
   * second render overwrites the object and then fails to insert its row.
   * Compensating blindly would delete the letter the first, successful render
   * still owns.
   */
  it("does not delete an object a surviving row still owns", async () => {
    await expect(
      withOrphanCleanup(
        dbWithOwners([{ id: "existing-asset" }]),
        "renders/draft-1/1.pdf",
        silentLogger,
        async () => {
          throw new Error("duplicate key value violates unique constraint");
        },
      ),
    ).rejects.toThrow("duplicate key");

    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * Receipts live outside `file_assets` entirely and the orphan sweep never
   * touches `receipts/`, so this check is the only thing standing between a
   * failed retry and the loss of a VAT receipt we must keep under Swiss
   * bookkeeping duty.
   */
  it("does not delete a receipt PDF whose receipts row already exists", async () => {
    await expect(
      withOrphanCleanup(
        dbWithOwners([], [{ id: "existing-receipt" }]),
        "receipts/pay-1.pdf",
        silentLogger,
        async () => {
          throw new Error("insert failed");
        },
      ),
    ).rejects.toThrow("insert failed");

    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
  });

  /**
   * And not even when nothing owns it. No identity check on an object is strong
   * enough to bet an accounting record on, so a receipt is never deleted
   * speculatively — an orphaned receipt object costs kilobytes, a deleted one
   * costs a record Swiss bookkeeping duty requires us to produce.
   */
  it("never deletes a receipt PDF, even one nothing owns", async () => {
    await expect(
      withOrphanCleanup(ownedByNobody(), "receipts/pay-2.pdf", silentLogger, async () => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");

    expect(deleteObjectIfUnchangedMock).not.toHaveBeenCalled();
    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "protected" }),
      expect.any(String),
    );
  });
});

/**
 * Deleting a document has to delete its contents too. `extracted_text` holds up
 * to 12,000 characters of the user's document, and used to survive deletion
 * indefinitely (docs/data-retention.md, F1).
 *
 * The row is left `pending_deletion` rather than `deleted`: the object still
 * has to go, and only pending rows are on the cleanup worker's work list, so
 * marking it deleted up front meant a failed storage delete was never retried.
 */
describe("deleteFileAsset", () => {
  it("clears the extracted text and leaves the row on the cleanup queue", async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const db: Record<string, unknown> = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "file-1",
            sessionId: "session-1",
            storageKey: "attachments/session-1/file-1",
          },
        ]),
      }),
      update: vi.fn().mockReturnValue({ set }),
    };
    // The retire now runs inside a transaction that holds the draft's row lock.
    db.transaction = (run: (tx: unknown) => Promise<void>) => run(db);

    await deleteFileAsset(db as never, "file-1", "session-1");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending_deletion", extractedText: null }),
    );
  });
});
