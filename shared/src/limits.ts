export const FILE_LIMITS = {
  attachment: {
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"] as const,
  },
  signature: {
    maxBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg"] as const,
  },
  totalDraftUploadBytes: 27 * 1024 * 1024,
  maxAttachmentsPerDraft: 5,
  maxSignaturesPerDraft: 1,
} as const;

// ---------------------------------------------------------------------------
// Attachment ingestion — how much of an attached document the assistant reads.
// The per-document + total character caps bound the tokens injected into the
// drafting prompt on every turn, so a large file can never run up AI fees.
// ---------------------------------------------------------------------------

export const ATTACHMENT_INGESTION = {
  /** Text-layer PDFs are read for free (unpdf). Everything else falls to OCR. */
  textReadableMimeTypes: ["application/pdf"] as const,
  /** Scans/photos we can OCR when Document Intelligence is configured. */
  ocrMimeTypes: ["application/pdf", "image/png", "image/jpeg"] as const,
  /** Text-layer PDFs beyond this many pages are not read (cost/size guard). */
  maxReadablePages: 15,
  /** OCR (per-page billed) is capped hard per document. */
  maxOcrPages: 5,
  /** Per-session rolling-24h OCR budget so a user can't run up fees. */
  maxOcrDocsPerSessionPerDay: 15,
  /** Hard cap on characters kept/injected per document (~3k tokens). */
  maxExtractedChars: 12_000,
  /** Cap on total characters injected across all of a draft's documents. */
  maxTotalInjectedChars: 24_000,
} as const;

/**
 * pending → reading; ocr_running → reading a scan/photo; extracted → read;
 * failed → OCR ran but couldn't read; too_long → over the OCR page cap;
 * budget → session OCR allowance spent; no_ocr → scan/image but OCR is off.
 * empty/unsupported retained for pre-OCR rows.
 */
export type AttachmentExtractionStatus =
  | "pending"
  | "ocr_running"
  | "extracted"
  | "empty"
  | "unsupported"
  | "no_ocr"
  | "too_long"
  | "budget"
  | "failed";

/** Whether the assistant used the document's content (drives UI + injection). */
export function isExtractionReadable(status: AttachmentExtractionStatus): boolean {
  return status === "extracted";
}

export const DRAFT_CONTENT_LIMITS = {
  subjectChars: 200,
  bodyChars: 10_000,
  messageChars: 2_000,
} as const;

export const DICTATION_LIMITS = {
  sampleRateHz: 16_000,
  channelCount: 1,
  maxCaptureSeconds: 120,
  maxFallbackBytes: 4 * 1024 * 1024,
} as const;

// ---------------------------------------------------------------------------
// Signing limits for non-visual signing sessions and retained evidence.
// ---------------------------------------------------------------------------

export const SIGNING_LIMITS = {
  identVerificationTtlMinutes: 30,
  signingSessionTtlMinutes: 30,
  identReuseDurationDays: 365 * 5,
  signedEvidenceRetentionDays: 365 * 10,
  maxSignersPerDraft: 1,
} as const;

export type UploadKind = keyof Pick<typeof FILE_LIMITS, "attachment" | "signature">;

export function getAllowedMimeTypes(kind: UploadKind): readonly string[] {
  return FILE_LIMITS[kind].allowedMimeTypes;
}

export function getUploadByteLimit(kind: UploadKind): number {
  return FILE_LIMITS[kind].maxBytes;
}

export function isAllowedUploadMimeType(kind: UploadKind, mimeType: string): boolean {
  return getAllowedMimeTypes(kind).includes(mimeType);
}
