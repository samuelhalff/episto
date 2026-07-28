import { z } from "zod";

import { FILE_LIMITS } from "@episto/shared";

/**
 * Upload limits, kept out of the main schema so the operator dials for file
 * handling read as one block.
 *
 * The defaults are the shipped values from `shared/src/limits.ts`, which the
 * frontend also reads for its client-side hints; the backend enforces whatever
 * is configured here and reports it back in `attachmentConstraints`, so the UI
 * can never advertise a different ceiling from the one the server applies.
 */
export const UPLOAD_LIMIT_ENV_FIELDS = {
  MAX_ATTACHMENT_FILE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(FILE_LIMITS.attachment.maxBytes),
  MAX_ATTACHMENTS_PER_DRAFT: z.coerce
    .number()
    .int()
    .positive()
    .default(FILE_LIMITS.maxAttachmentsPerDraft),
  MAX_TOTAL_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(FILE_LIMITS.totalDraftUploadBytes),
  MAX_SIGNATURE_FILE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(FILE_LIMITS.signature.maxBytes),
} as const;
