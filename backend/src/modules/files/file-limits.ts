import { FILE_LIMITS, type UploadKind } from "@episto/shared";

import { env, isEnvLoaded } from "../../shared/config/index.js";

export type ConfiguredFileLimits = {
  attachmentMaxBytes: number;
  signatureMaxBytes: number;
  maxAttachmentsPerDraft: number;
  totalDraftUploadBytes: number;
};

/**
 * The enforced upload limits.
 *
 * `FILE_LIMITS` in shared/ stays the shipped default and the frontend's
 * client-side hint; this is the single place the backend reads, so raising a
 * limit for a customer is an env change rather than a deploy. Unit tests that
 * never boot the config fall back to the same defaults.
 */
export function getConfiguredFileLimits(): ConfiguredFileLimits {
  if (!isEnvLoaded()) {
    return {
      attachmentMaxBytes: FILE_LIMITS.attachment.maxBytes,
      signatureMaxBytes: FILE_LIMITS.signature.maxBytes,
      maxAttachmentsPerDraft: FILE_LIMITS.maxAttachmentsPerDraft,
      totalDraftUploadBytes: FILE_LIMITS.totalDraftUploadBytes,
    };
  }

  const config = env();
  return {
    attachmentMaxBytes: config.MAX_ATTACHMENT_FILE_BYTES,
    signatureMaxBytes: config.MAX_SIGNATURE_FILE_BYTES,
    maxAttachmentsPerDraft: config.MAX_ATTACHMENTS_PER_DRAFT,
    totalDraftUploadBytes: config.MAX_TOTAL_UPLOAD_BYTES,
  };
}

export function getConfiguredUploadByteLimit(kind: UploadKind): number {
  const limits = getConfiguredFileLimits();
  return kind === "attachment" ? limits.attachmentMaxBytes : limits.signatureMaxBytes;
}

/** The multipart edge cap: the largest single file any upload kind may carry. */
export function getMaxSingleUploadBytes(): number {
  const limits = getConfiguredFileLimits();
  return Math.max(limits.attachmentMaxBytes, limits.signatureMaxBytes);
}

/** Limits are configured in bytes but reported to users in MB. */
export function formatByteLimitMb(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
