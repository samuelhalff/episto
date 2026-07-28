import { beforeEach, describe, expect, it, vi } from "vitest";
import { FILE_LIMITS } from "@episto/shared";

// The point of these tests: the numbers the backend enforces and advertises
// must come from the environment, not from the shared compile-time defaults.
// Every override below is deliberately different from `FILE_LIMITS`, so a
// regression that reads the constant fails instead of coincidentally passing.
const envOverrides = {
  MAX_ATTACHMENT_FILE_BYTES: 6 * 1024 * 1024,
  MAX_SIGNATURE_FILE_BYTES: 3 * 1024 * 1024,
  MAX_ATTACHMENTS_PER_DRAFT: 9,
  MAX_TOTAL_UPLOAD_BYTES: 40 * 1024 * 1024,
};

const envMock = vi.hoisted(() => ({ loaded: true }));

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => envMock.loaded,
  env: () => envOverrides,
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  deleteObject: vi.fn(),
  deleteObjectIfUnchanged: vi.fn(),
  headObject: vi.fn(),
}));

vi.mock("../src/modules/dispatch/adapters/postal.adapter.js", async () => {
  const { getStubDispatchCapabilities } =
    await import("../src/modules/dispatch/adapters/provider-capabilities.js");
  return { getDispatchAdapter: () => ({ getCapabilities: getStubDispatchCapabilities }) };
});

import {
  formatByteLimitMb,
  getConfiguredFileLimits,
  getMaxSingleUploadBytes,
} from "../src/modules/files/file-limits.js";
import { getDraftAttachmentConstraints } from "../src/modules/files/file.service.js";
import { assertUploadAcceptable } from "../src/modules/files/upload-validation.js";

function pdfOfSize(bytes: number): Buffer {
  const buffer = Buffer.alloc(bytes, 0x20);
  buffer.write("%PDF-", 0, "ascii");
  return buffer;
}

function pngOfSize(bytes: number): Buffer {
  const buffer = Buffer.alloc(bytes, 0x20);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return buffer;
}

const attachmentConstraints = {
  maxAttachmentsPerDraft: envOverrides.MAX_ATTACHMENTS_PER_DRAFT,
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
  maxFileBytes: envOverrides.MAX_ATTACHMENT_FILE_BYTES,
  maxTotalBytes: envOverrides.MAX_TOTAL_UPLOAD_BYTES,
};

beforeEach(() => {
  envMock.loaded = true;
});

describe("configured file limits", () => {
  it("reads every limit from the environment", () => {
    expect(getConfiguredFileLimits()).toEqual({
      attachmentMaxBytes: envOverrides.MAX_ATTACHMENT_FILE_BYTES,
      signatureMaxBytes: envOverrides.MAX_SIGNATURE_FILE_BYTES,
      maxAttachmentsPerDraft: envOverrides.MAX_ATTACHMENTS_PER_DRAFT,
      totalDraftUploadBytes: envOverrides.MAX_TOTAL_UPLOAD_BYTES,
    });
  });

  it("falls back to the shipped defaults when config is not loaded", () => {
    envMock.loaded = false;
    expect(getConfiguredFileLimits()).toEqual({
      attachmentMaxBytes: FILE_LIMITS.attachment.maxBytes,
      signatureMaxBytes: FILE_LIMITS.signature.maxBytes,
      maxAttachmentsPerDraft: FILE_LIMITS.maxAttachmentsPerDraft,
      totalDraftUploadBytes: FILE_LIMITS.totalDraftUploadBytes,
    });
  });

  it("admits the largest configured single file at the multipart edge", () => {
    expect(getMaxSingleUploadBytes()).toBe(envOverrides.MAX_ATTACHMENT_FILE_BYTES);
  });

  it("formats whole and fractional megabytes for user-facing messages", () => {
    expect(formatByteLimitMb(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatByteLimitMb(1_500_000)).toBe("1.4 MB");
  });
});

describe("upload size enforcement", () => {
  it("accepts an attachment over the shared default but under the configured limit", () => {
    const oversizedForDefault = FILE_LIMITS.attachment.maxBytes + 1024;
    expect(() =>
      assertUploadAcceptable(
        "attachment",
        "application/pdf",
        pdfOfSize(oversizedForDefault),
        attachmentConstraints,
      ),
    ).not.toThrow();
  });

  it("rejects an attachment one byte past the configured limit", () => {
    expect(() =>
      assertUploadAcceptable(
        "attachment",
        "application/pdf",
        pdfOfSize(envOverrides.MAX_ATTACHMENT_FILE_BYTES + 1),
        attachmentConstraints,
      ),
    ).toThrow(/maximum size of 6 MB/);
  });

  it("enforces the configured signature limit at its own boundary", () => {
    expect(() =>
      assertUploadAcceptable(
        "signature",
        "image/png",
        pngOfSize(envOverrides.MAX_SIGNATURE_FILE_BYTES),
        attachmentConstraints,
      ),
    ).not.toThrow();

    expect(() =>
      assertUploadAcceptable(
        "signature",
        "image/png",
        pngOfSize(envOverrides.MAX_SIGNATURE_FILE_BYTES + 1),
        attachmentConstraints,
      ),
    ).toThrow(/maximum size of 3 MB/);
  });
});

describe("limits advertised to the client", () => {
  it("reports the configured limits, so the UI cannot disagree with the server", () => {
    const constraints = getDraftAttachmentConstraints();

    expect(constraints.maxFileBytes).toBe(envOverrides.MAX_ATTACHMENT_FILE_BYTES);
    expect(constraints.maxTotalBytes).toBe(envOverrides.MAX_TOTAL_UPLOAD_BYTES);
    expect(constraints.maxAttachmentsPerDraft).toBe(
      envOverrides.MAX_ATTACHMENTS_PER_DRAFT,
    );
  });
});
