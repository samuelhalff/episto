import {
  FILE_LIMITS,
  isAllowedUploadMimeType,
  type DraftAttachmentConstraints,
} from "@episto/shared";

import { validationError } from "../../shared/errors/index.js";
import { createAttachmentMimeTypeError } from "../dispatch/adapters/provider-capabilities.js";
import { formatByteLimitMb, getConfiguredUploadByteLimit } from "./file-limits.js";
import { assertUploadMimeMatchesContent } from "./file.service.js";

/**
 * Reject an upload we will not accept, before anything is written.
 *
 * Type and size are checked against two different sources on purpose:
 * attachments are bounded by what the postal provider will actually print and
 * enclose, signatures by what we can render. The content sniff last, because a
 * declared MIME type is only a claim.
 */
export function assertUploadAcceptable(
  kind: "attachment" | "signature",
  mimeType: string,
  buffer: Buffer,
  attachmentConstraints: DraftAttachmentConstraints,
): void {
  if (
    kind === "attachment" &&
    !attachmentConstraints.allowedMimeTypes.includes(mimeType)
  ) {
    throw createAttachmentMimeTypeError(attachmentConstraints);
  }

  if (kind === "signature" && !isAllowedUploadMimeType(kind, mimeType)) {
    throw validationError("Unsupported file type for signature. Allowed: PNG, JPEG", [
      {
        field: "file",
        message: `Allowed types: ${FILE_LIMITS[kind].allowedMimeTypes.join(", ")}`,
      },
    ]);
  }

  const maxBytes = getConfiguredUploadByteLimit(kind);
  if (buffer.byteLength > maxBytes) {
    const limit = formatByteLimitMb(maxBytes);
    throw validationError(
      kind === "attachment"
        ? `Attachment exceeds maximum size of ${limit}`
        : `Signature exceeds maximum size of ${limit}`,
      [{ field: "file", message: `Maximum ${kind} size is ${limit}` }],
    );
  }

  assertUploadMimeMatchesContent(kind, mimeType, buffer);
}
