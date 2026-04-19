import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DICTATION_LIMITS,
  DRAFT_CONTENT_LIMITS,
  FILE_LIMITS,
  getAllowedMimeTypes,
  getUploadByteLimit,
  isAllowedUploadMimeType,
} from "../src/limits.js";
import { DraftLetterSchema } from "../src/schemas/index.js";
import { UpdateDraftInput, SendMessageInput } from "../src/contracts/index.js";

describe("shared upload limits", () => {
  it("exposes the doc-backed attachment and signature limits", () => {
    expect(FILE_LIMITS.attachment.maxBytes).toBe(5 * 1024 * 1024);
    expect(FILE_LIMITS.signature.maxBytes).toBe(2 * 1024 * 1024);
    expect(FILE_LIMITS.totalDraftUploadBytes).toBe(27 * 1024 * 1024);
    expect(FILE_LIMITS.maxAttachmentsPerDraft).toBe(5);
    expect(FILE_LIMITS.maxSignaturesPerDraft).toBe(1);
  });

  it("returns the canonical MIME allow-lists", () => {
    expect(getAllowedMimeTypes("attachment")).toEqual([
      "application/pdf",
      "image/png",
      "image/jpeg",
    ]);
    expect(getAllowedMimeTypes("signature")).toEqual(["image/png", "image/jpeg"]);
  });

  it("validates upload MIME types consistently", () => {
    expect(isAllowedUploadMimeType("attachment", "application/pdf")).toBe(true);
    expect(isAllowedUploadMimeType("attachment", "image/webp")).toBe(false);
    expect(isAllowedUploadMimeType("signature", "image/jpeg")).toBe(true);
    expect(isAllowedUploadMimeType("signature", "image/svg+xml")).toBe(false);
  });

  it("returns the configured byte limit for each upload kind", () => {
    expect(getUploadByteLimit("attachment")).toBe(FILE_LIMITS.attachment.maxBytes);
    expect(getUploadByteLimit("signature")).toBe(FILE_LIMITS.signature.maxBytes);
  });
});

describe("shared text limits", () => {
  const validDraft = {
    id: randomUUID(),
    sessionId: randomUUID(),
    status: "collecting",
    locale: "de-CH",
    deliveryType: "standard",
    signatureAssuranceLevel: "visual",
    subject: "Subject",
    body: "Body",
    tone: null,
    intent: null,
    enclosureNote: null,
    signatureMode: null,
    schemaVersion: 1,
    senderProfileId: null,
    recipientProfileId: null,
    signatureAssetId: null,
    estimatedPages: null,
    reviewedAt: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as const;

  it("keeps schemas aligned with the canonical draft text limits", () => {
    expect(
      DraftLetterSchema.parse({
        ...validDraft,
        subject: "x".repeat(DRAFT_CONTENT_LIMITS.subjectChars),
        body: "x".repeat(DRAFT_CONTENT_LIMITS.bodyChars),
      }),
    ).toBeDefined();

    expect(() =>
      DraftLetterSchema.parse({
        ...validDraft,
        subject: "x".repeat(DRAFT_CONTENT_LIMITS.subjectChars + 1),
      }),
    ).toThrow();
  });

  it("keeps API input contracts aligned with the same limits", () => {
    expect(
      UpdateDraftInput.parse({
        subject: "x".repeat(DRAFT_CONTENT_LIMITS.subjectChars),
        body: "x".repeat(DRAFT_CONTENT_LIMITS.bodyChars),
      }),
    ).toBeDefined();

    expect(() =>
      SendMessageInput.parse({
        content: "x".repeat(DRAFT_CONTENT_LIMITS.messageChars + 1),
      }),
    ).toThrow();
  });
});

describe("shared dictation limits", () => {
  it("keeps frontend and backend aligned on the canonical audio capture format", () => {
    expect(DICTATION_LIMITS.sampleRateHz).toBe(16_000);
    expect(DICTATION_LIMITS.channelCount).toBe(1);
    expect(DICTATION_LIMITS.maxCaptureSeconds).toBe(120);
    expect(DICTATION_LIMITS.maxFallbackBytes).toBe(4 * 1024 * 1024);
  });
});
