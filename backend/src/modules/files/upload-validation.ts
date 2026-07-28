import {
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
  type DraftAttachmentConstraints,
} from "@episto/shared";

import { validationError } from "../../shared/errors/index.js";
import { createAttachmentMimeTypeError } from "../dispatch/adapters/provider-capabilities.js";
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

  const maxBytes = getUploadByteLimit(kind);
  if (buffer.byteLength > maxBytes) {
    throw validationError(
      kind === "attachment"
        ? "Attachment exceeds maximum size of 5 MB"
        : "Signature exceeds maximum size of 2 MB",
      [
        {
          field: "file",
          message: `Maximum ${kind} size is ${Math.round(maxBytes / 1024 / 1024)} MB`,
        },
      ],
    );
  }

  assertUploadMimeMatchesContent(kind, mimeType, buffer);
}
