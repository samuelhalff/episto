import { describe, it, expect } from "vitest";
import {
  assertUploadMimeMatchesContent,
  attachmentStorageKey,
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
});
