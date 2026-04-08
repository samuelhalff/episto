import { describe, expect, it, vi } from "vitest";

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

import {
  assertUploadMimeMatchesContent,
  attachmentStorageKey,
  createFileAsset,
  signatureStorageKey,
  renderStorageKey,
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
