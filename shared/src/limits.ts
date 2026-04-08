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

export const DRAFT_CONTENT_LIMITS = {
  subjectChars: 200,
  bodyChars: 10_000,
  messageChars: 2_000,
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
