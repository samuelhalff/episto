import {
  type DispatchPackage,
  type DispatchParty,
  type DispatchProviderCapabilities,
  type PostalPostage,
} from "@swiss-mail/shared";
import { AppError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import { downloadObjectBuffer } from "../../files/adapters/s3.adapter.js";
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";
import {
  createAttachmentLimitError,
  createAttachmentMimeTypeError,
  getAttachmentHandling,
} from "./provider-capabilities.js";
import { BRAND_NAME } from "../../../shared/brand.js";
import type { JsonRecord } from "./epost-types.js";

const PER_DOCUMENT_LIMIT_BYTES = 200 * 1024 * 1024;
const TOTAL_DELIVERY_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

const REFERENCE_PROBE_SENDER = {
  firstName: "Swiss",
  lastName: "Mail",
  company: BRAND_NAME,
  addressLine1: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zurich",
  country: "CH",
  email: null,
  phone: null,
} as const satisfies DispatchParty;

const REFERENCE_PROBE_RECIPIENT = {
  firstName: "Pricing",
  lastName: "Probe",
  company: null,
  addressLine1: "Rue du Rhone 1",
  postalCode: "1204",
  city: "Geneva",
  country: "CH",
  email: null,
  phone: null,
} as const satisfies DispatchParty;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getPartyDisplayName(party: DispatchParty): string {
  return (
    party.company?.trim() ||
    [party.firstName ?? "", party.lastName ?? ""]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ")
  );
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function splitStreetAddress(addressLine1: string): {
  street: string;
  streetNumber: string;
} {
  const normalized = normalizeWhitespace(addressLine1);
  const trailingNumberMatch = normalized.match(/^(.*?)[,\s]+([0-9][0-9A-Za-z/-]*)$/);
  if (trailingNumberMatch) {
    const street = trailingNumberMatch[1] ?? normalized;
    const streetNumber = trailingNumberMatch[2] ?? "";
    return {
      street: street.trim(),
      streetNumber: streetNumber.trim(),
    };
  }

  const leadingNumberMatch = normalized.match(/^([0-9][0-9A-Za-z/-]*)[,\s]+(.+)$/);
  if (leadingNumberMatch) {
    const street = leadingNumberMatch[2] ?? normalized;
    const streetNumber = leadingNumberMatch[1] ?? "";
    return {
      street: street.trim(),
      streetNumber: streetNumber.trim(),
    };
  }

  return {
    street: normalized,
    streetNumber: "",
  };
}

export function validatePackage(
  dispatchPackage: DispatchPackage,
  capabilities: DispatchProviderCapabilities,
): void {
  const attachmentPolicy = capabilities.attachmentPolicy;
  const attachmentHandling = getAttachmentHandling(
    dispatchPackage.attachments.length,
    attachmentPolicy,
  );

  if (dispatchPackage.renderedPdf.mimeType !== "application/pdf") {
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "EPOST_PRIMARY_PDF_REQUIRED",
      message: "ePost physical delivery requires the rendered letter to be a PDF.",
      userMessage: "The generated letter must be a PDF before it can be sent.",
      userAction: "Render the letter again and retry.",
    });
  }

  if (attachmentHandling === "unverified") {
    throw createAttachmentLimitError(attachmentPolicy);
  }

  if (
    dispatchPackage.attachments.some(
      (attachment) => !attachmentPolicy.allowedMimeTypes.includes(attachment.mimeType),
    )
  ) {
    throw createAttachmentMimeTypeError(attachmentPolicy);
  }

  const totalSizeBytes =
    dispatchPackage.renderedPdf.sizeBytes +
    dispatchPackage.attachments.reduce(
      (sum, attachment) => sum + attachment.sizeBytes,
      0,
    );

  if (totalSizeBytes > TOTAL_DELIVERY_LIMIT_BYTES) {
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "EPOST_DELIVERY_TOO_LARGE",
      message: "The delivery exceeds ePost's documented 2GB total size limit.",
      userMessage: "The uploaded files are too large to send together.",
      userAction: "Reduce the file sizes and try again.",
    });
  }

  for (const asset of [dispatchPackage.renderedPdf, ...dispatchPackage.attachments]) {
    if (asset.sizeBytes > PER_DOCUMENT_LIMIT_BYTES) {
      throw new AppError({
        family: "validation_error",
        statusCode: 400,
        code: "EPOST_DOCUMENT_TOO_LARGE",
        message: `File ${asset.filename} exceeds ePost's documented 200MB per-document limit.`,
        userMessage: "One of the files is too large to send.",
        userAction: "Reduce the file size and try again.",
      });
    }
  }
}

function mapPostage(deliveryType: DispatchPackage["deliveryType"]): PostalPostage {
  const config = env();
  return deliveryType === "registered"
    ? config.EPOST_REGISTERED_POSTAGE
    : config.EPOST_STANDARD_POSTAGE;
}

function buildRecipient(dispatchPackage: DispatchPackage): JsonRecord {
  const { recipient } = dispatchPackage;
  const { street, streetNumber } = splitStreetAddress(recipient.addressLine1);

  return {
    senderUserId: dispatchPackage.draftId,
    allCredentialShouldMatch: true,
    unhashedCredentials: {
      firstName: recipient.firstName ?? undefined,
      lastName: recipient.lastName ?? undefined,
      companyName: recipient.company ?? undefined,
      street,
      streetNumber: streetNumber || undefined,
      zipCode: recipient.postalCode,
      city: recipient.city,
      email: recipient.email ?? undefined,
      mobileNumber: recipient.phone ?? undefined,
    },
  };
}

function buildSenderAddress(sender: DispatchParty): JsonRecord {
  const { street, streetNumber } = splitStreetAddress(sender.addressLine1);

  return {
    name: getPartyDisplayName(sender),
    street,
    streetNumber: streetNumber || undefined,
    zipCode: sender.postalCode,
    city: sender.city,
  };
}

function buildReferencePricingRecipient(): JsonRecord {
  const { street, streetNumber } = splitStreetAddress(
    REFERENCE_PROBE_RECIPIENT.addressLine1,
  );

  return {
    senderUserId: "pricing-reference-probe",
    allCredentialShouldMatch: true,
    unhashedCredentials: {
      firstName: REFERENCE_PROBE_RECIPIENT.firstName,
      lastName: REFERENCE_PROBE_RECIPIENT.lastName,
      companyName: REFERENCE_PROBE_RECIPIENT.company ?? undefined,
      street,
      streetNumber: streetNumber || undefined,
      zipCode: REFERENCE_PROBE_RECIPIENT.postalCode,
      city: REFERENCE_PROBE_RECIPIENT.city,
    },
  };
}

function buildDocumentMetadata(
  dispatchPackage: DispatchPackage,
  options: { preview: boolean },
  capabilities: DispatchProviderCapabilities,
): JsonRecord {
  const attachmentHandling = getAttachmentHandling(
    dispatchPackage.attachments.length,
    capabilities.attachmentPolicy,
  );
  const physicalAdditionalInfo: JsonRecord = {
    shippingCountry: dispatchPackage.recipient.country,
    envelopeSize: "C5",
    postage: mapPostage(dispatchPackage.deliveryType),
    windowLocation: "RIGHT",
    duplex: false,
    senderAddress: buildSenderAddress(dispatchPackage.sender),
  };

  if (options.preview) {
    physicalAdditionalInfo.numberOfPage = Math.max(
      1,
      dispatchPackage.estimatedPages ?? 1,
    );
  }

  if (attachmentHandling === "single_hint") {
    physicalAdditionalInfo.attachment = dispatchPackage.attachments[0]?.filename;
  }

  return {
    fileName: dispatchPackage.renderedPdf.filename,
    deliveryChannelPreferences: ["PHYSICAL"],
    recipients: [buildRecipient(dispatchPackage)],
    senderName: getPartyDisplayName(dispatchPackage.sender),
    senderEndToEndId: dispatchPackage.snapshotId,
    senderCaseId: dispatchPackage.draftId,
    documentTitle: stripExtension(dispatchPackage.renderedPdf.filename),
    documentTypes: ["message"],
    physicalAdditionalInfo,
  };
}

function createJsonFormData(metadata: JsonRecord): FormData {
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  return form;
}

export function createReferencePricingPreviewRequest(
  input: DispatchPricingInput,
  capabilities: DispatchProviderCapabilities,
): FormData {
  const attachmentHandling = getAttachmentHandling(
    input.attachmentMode === "single_hint" ? 1 : 0,
    capabilities.attachmentPolicy,
  );

  if (attachmentHandling === "unverified") {
    throw createAttachmentLimitError(capabilities.attachmentPolicy);
  }

  const physicalAdditionalInfo: JsonRecord = {
    shippingCountry: input.shippingCountry,
    envelopeSize: input.envelopeSize,
    postage: input.postage,
    windowLocation: input.windowLocation,
    duplex: input.duplex,
    numberOfPage: input.numberOfPage,
    senderAddress: buildSenderAddress(REFERENCE_PROBE_SENDER),
  };

  if (input.attachmentMode === "single_hint") {
    physicalAdditionalInfo.attachment = "reference-attachment.pdf";
  }

  return createJsonFormData({
    fileMetadata: [
      {
        fileName: "reference-pricing.pdf",
        deliveryChannelPreferences: ["PHYSICAL"],
        recipients: [buildReferencePricingRecipient()],
        senderName: getPartyDisplayName(REFERENCE_PROBE_SENDER),
        senderEndToEndId: "pricing-reference-probe",
        senderCaseId: "pricing-reference-probe",
        documentTitle: "reference-pricing",
        documentTypes: ["message"],
        physicalAdditionalInfo,
      },
    ],
  });
}

export function createDispatchPreviewRequest(
  dispatchPackage: DispatchPackage,
  capabilities: DispatchProviderCapabilities,
): FormData {
  return createJsonFormData({
    fileMetadata: [buildDocumentMetadata(dispatchPackage, { preview: true }, capabilities)],
  });
}

export async function createSynchronousDeliveryForm(
  dispatchPackage: DispatchPackage,
  capabilities: DispatchProviderCapabilities,
): Promise<FormData> {
  const form = createJsonFormData({
    fileMetadata: [buildDocumentMetadata(dispatchPackage, { preview: false }, capabilities)],
  });

  const primaryPdf = await downloadObjectBuffer(dispatchPackage.renderedPdf.storageKey);
  form.append(
    "files",
    new Blob([primaryPdf.buffer], {
      type: primaryPdf.contentType ?? dispatchPackage.renderedPdf.mimeType,
    }),
    dispatchPackage.renderedPdf.filename,
  );

  if (dispatchPackage.attachments.length === 1) {
    const attachmentAsset = dispatchPackage.attachments[0];
    if (!attachmentAsset) {
      throw new AppError({
        family: "dispatch_ambiguity",
        statusCode: 502,
        code: "EPOST_ATTACHMENT_MISSING",
        message: "Attachment metadata was missing while building the ePost request.",
        userMessage: "The attachment could not be prepared for sending.",
        userAction: "Try again or remove the attachment.",
      });
    }

    const attachment = await downloadObjectBuffer(attachmentAsset.storageKey);
    form.append(
      "files",
      new Blob([attachment.buffer], {
        type: attachment.contentType ?? attachmentAsset.mimeType,
      }),
      attachmentAsset.filename,
    );
  }

  return form;
}
