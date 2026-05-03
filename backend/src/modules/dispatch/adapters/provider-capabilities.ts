import {
  DispatchAttachmentPolicySchema,
  DispatchProviderCapabilitiesSchema,
  FILE_LIMITS,
  type DispatchAttachmentPolicy,
  type DispatchProviderCapabilities,
} from "@episto/shared";

import { AppError } from "../../../shared/errors/index.js";
import {
  getEpostProviderName,
  type EpostSubmissionMode,
} from "./epost-submission-mode.js";

const EPOST_ATTACHMENT_POLICY = DispatchAttachmentPolicySchema.parse({
  maxAttachmentsPerDraft: 1,
  allowedMimeTypes: ["application/pdf"],
});

const DEFAULT_ATTACHMENT_POLICY = DispatchAttachmentPolicySchema.parse({
  maxAttachmentsPerDraft: FILE_LIMITS.maxAttachmentsPerDraft,
  allowedMimeTypes: [...FILE_LIMITS.attachment.allowedMimeTypes],
});

export function getEpostDispatchCapabilities(
  submissionMode: EpostSubmissionMode = "live",
): DispatchProviderCapabilities {
  return DispatchProviderCapabilitiesSchema.parse({
    providerName: getEpostProviderName(submissionMode),
    attachmentPolicy: EPOST_ATTACHMENT_POLICY,
  });
}

export function getStubDispatchCapabilities(): DispatchProviderCapabilities {
  return DispatchProviderCapabilitiesSchema.parse({
    providerName: "stub",
    attachmentPolicy: DEFAULT_ATTACHMENT_POLICY,
  });
}

export function createAttachmentLimitError(
  attachmentPolicy: Pick<
    DispatchAttachmentPolicy,
    "maxAttachmentsPerDraft" | "allowedMimeTypes"
  >,
): AppError {
  if (
    attachmentPolicy.maxAttachmentsPerDraft === 1 &&
    attachmentPolicy.allowedMimeTypes.length === 1 &&
    attachmentPolicy.allowedMimeTypes[0] === "application/pdf"
  ) {
    return new AppError({
      family: "policy_refusal",
      statusCode: 422,
      code: "ATTACHMENT_LIMIT_REACHED",
      message:
        "The active dispatch provider currently supports only one attachment per letter.",
      userMessage: "Only one PDF attachment is supported per letter right now.",
      userAction: "Remove the existing attachment before adding another one.",
    });
  }

  return new AppError({
    family: "policy_refusal",
    statusCode: 422,
    code: "ATTACHMENT_LIMIT_REACHED",
    message: `Maximum ${attachmentPolicy.maxAttachmentsPerDraft} attachments per draft`,
    userMessage: `You can attach up to ${attachmentPolicy.maxAttachmentsPerDraft} files per letter.`,
    userAction: "Remove an existing attachment before adding a new one.",
  });
}

export function createAttachmentMimeTypeError(
  attachmentPolicy: Pick<DispatchAttachmentPolicy, "allowedMimeTypes">,
): AppError {
  if (
    attachmentPolicy.allowedMimeTypes.length === 1 &&
    attachmentPolicy.allowedMimeTypes[0] === "application/pdf"
  ) {
    return new AppError({
      family: "policy_refusal",
      statusCode: 422,
      code: "ATTACHMENT_MIME_TYPE_NOT_ALLOWED",
      message: "The active dispatch provider currently supports PDF attachments only.",
      userMessage: "Attachments must be PDFs right now.",
      userAction: "Convert the file to PDF or remove it before continuing.",
    });
  }

  return new AppError({
    family: "validation_error",
    statusCode: 422,
    code: "ATTACHMENT_MIME_TYPE_NOT_ALLOWED",
    message: "Unsupported file type for attachment.",
    userMessage: `Attachments must use one of: ${attachmentPolicy.allowedMimeTypes.join(", ")}.`,
    userAction: "Choose a supported file type and try again.",
  });
}

export function getAttachmentHandling(
  attachmentCount: number,
  attachmentPolicy: Pick<DispatchAttachmentPolicy, "maxAttachmentsPerDraft">,
): "excluded" | "single_hint" | "unverified" {
  if (attachmentCount === 0) {
    return "excluded";
  }

  return attachmentCount <= attachmentPolicy.maxAttachmentsPerDraft
    ? "single_hint"
    : "unverified";
}
