import {
  type DispatchProviderCapabilities,
  DispatchQuoteSchema,
  DispatchStatusLookupSchema,
  DispatchSubmitResultSchema,
  type DispatchPackage,
  type DispatchQuote,
  type DispatchStatusLookup,
  type DispatchSubmitResult,
  type DispatchParty,
  type PostalPostage,
} from "@swiss-mail/shared";

import { AppError, providerOutageError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import { downloadObjectBuffer } from "../../files/adapters/s3.adapter.js";
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";
import {
  createAttachmentLimitError,
  createAttachmentMimeTypeError,
  getEpostDispatchCapabilities,
  getAttachmentHandling,
} from "./provider-capabilities.js";
import { BRAND_NAME } from "../../../shared/brand.js";
import {
  lookupMockEpostStatus,
  submitMockEpostDelivery,
  isMockEpostProviderReference,
} from "./mock-epost-submission.js";
import { type EpostSubmissionMode } from "./epost-submission-mode.js";

const PER_DOCUMENT_LIMIT_BYTES = 200 * 1024 * 1024;
const TOTAL_DELIVERY_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_POLL_INTERVAL_MS = 1000;

type JsonRecord = Record<string, unknown>;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getPartyDisplayName(party: DispatchParty): string {
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

function validatePackage(
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

function extractPhysicalPreviewPrice(preview: JsonRecord): {
  pricePreview: JsonRecord | undefined;
  physicalPrice: JsonRecord | undefined;
  providerQuotedCents: number | null;
} {
  const pricePreview = Array.isArray(preview.pricePreview)
    ? (preview.pricePreview[0] as JsonRecord | undefined)
    : undefined;
  const potentialPrices = Array.isArray(pricePreview?.potentialPrices)
    ? pricePreview.potentialPrices
    : [];
  const physicalPrice = potentialPrices.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      (candidate as JsonRecord).channel === "PHYSICAL",
  ) as JsonRecord | undefined;
  const providerPriceRaw = physicalPrice?.price;

  return {
    pricePreview,
    physicalPrice,
    providerQuotedCents:
      typeof providerPriceRaw === "number" ? Math.round(providerPriceRaw * 100) : null,
  };
}

function findFirstTrackingNumber(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "trackingNumber" in value &&
    typeof (value as JsonRecord).trackingNumber === "string"
  ) {
    return (value as JsonRecord).trackingNumber as string;
  }

  for (const nested of Object.values(value as JsonRecord)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findFirstTrackingNumber(item);
        if (found) {
          return found;
        }
      }
      continue;
    }

    const found = findFirstTrackingNumber(nested);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as JsonRecord;
  for (const key of ["message", "errorMessage", "detail", "error"]) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function mapDeliveryStatus(status: unknown): DispatchSubmitResult["state"] {
  switch (status) {
    case "DELIVERED":
      return "accepted";
    case "ERROR":
      return "rejected";
    case "DELIVERED_WITH_ERROR":
      return "accepted";
    case "CREATED":
    case "PROCESSING":
      return "submitted";
    default:
      return "unknown";
  }
}

function mapStatusLookup(status: unknown): DispatchStatusLookup["state"] {
  switch (status) {
    case "DELIVERED":
      return "accepted";
    case "ERROR":
      return "rejected";
    case "DELIVERED_WITH_ERROR":
      return "accepted";
    case "CREATED":
    case "PROCESSING":
      return "submitted";
    default:
      return "unknown";
  }
}

function mapHttpError(operation: string, status: number, payload: unknown): AppError {
  const details =
    extractErrorMessage(payload) ?? `ePost ${operation} failed with status ${status}`;

  if (status === 400 || status === 422) {
    return new AppError({
      family: "dispatch_rejection",
      statusCode: 422,
      code: "EPOST_REJECTED_REQUEST",
      message: details,
      userMessage: "The postal provider rejected this letter.",
      userAction: "Check the letter data and try again.",
    });
  }

  if (status === 403) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "EPOST_ACCESS_DENIED",
      message: details,
      userMessage: "The postal provider account cannot perform this action right now.",
      userAction: "Verify the provider account setup and retry.",
    });
  }

  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "EPOST_REQUEST_FAILED",
    message: details,
    userMessage: "Postal dispatch is temporarily unavailable.",
    userAction: "Please try again shortly.",
  });
}

interface EpostDispatchAdapterOptions {
  capabilities?: DispatchProviderCapabilities;
  submissionMode?: EpostSubmissionMode;
}

export class EpostDispatchAdapter {
  private readonly capabilities: DispatchProviderCapabilities;
  private readonly submissionMode: EpostSubmissionMode;

  constructor(options: EpostDispatchAdapterOptions = {}) {
    this.submissionMode = options.submissionMode ?? env().EPOST_SUBMISSION_MODE;
    this.capabilities =
      options.capabilities ?? getEpostDispatchCapabilities(this.submissionMode);
  }

  private readonly baseUrl = env().EPOST_API_BASE_URL.replace(/\/$/, "");
  private readonly apiKey = env().EPOST_API_KEY;
  private readonly timeoutMs = env().EPOST_TIMEOUT_MS;

  getCapabilities(): DispatchProviderCapabilities {
    return this.capabilities;
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_API_KEY_MISSING",
        message: "EPOST_API_KEY is not configured.",
        userMessage: "Live postal pricing is unavailable in this environment.",
        userAction: "Configure the provider API key and retry.",
      });
    }

    return {
      "X-API-KEY": this.apiKey,
      Accept: "application/json",
    };
  }

  private async requestJson(
    path: string,
    init: RequestInit,
    operation: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...this.getHeaders(),
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });

      const rawText = await response.text();
      const payload = rawText ? JSON.parse(rawText) : null;

      if (!response.ok) {
        throw mapHttpError(operation, response.status, payload);
      }

      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw providerOutageError("ePost", error);
      }

      throw providerOutageError("ePost", error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollPreviewResult(previewId: string): Promise<JsonRecord> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() <= deadline) {
      const response = (await this.requestJson(
        `/epost/preview/delivery-prices/${previewId}/status`,
        { method: "GET" },
        "preview pricing status",
      )) as JsonRecord;

      const status = response.status;
      if (status === "FINISHED") {
        return response;
      }

      if (status === "ERROR") {
        throw new AppError({
          family: "dispatch_rejection",
          statusCode: 422,
          code: "EPOST_PREVIEW_FAILED",
          message:
            extractErrorMessage(response) ??
            `ePost delivery pricing preview ${previewId} ended in ERROR.`,
          userMessage: "The postal provider could not quote this delivery.",
          userAction: "Check the letter details and try again.",
        });
      }

      await sleep(DEFAULT_POLL_INTERVAL_MS);
    }

    throw new AppError({
      family: "dispatch_ambiguity",
      statusCode: 502,
      code: "EPOST_PREVIEW_TIMEOUT",
      message: `Timed out while waiting for ePost preview ${previewId}.`,
      userMessage: "The postal provider did not finish pricing in time.",
      userAction: "Please retry in a moment.",
    });
  }

  private async createPricingPreview(request: FormData): Promise<{
    previewId: string;
    preview: JsonRecord;
  }> {
    const created = (await this.requestJson(
      "/epost/preview/delivery-prices",
      {
        method: "POST",
        body: request,
      },
      "preview pricing",
    )) as JsonRecord;

    const previewId = typeof created.id === "string" ? created.id : null;
    if (!previewId) {
      throw new AppError({
        family: "dispatch_ambiguity",
        statusCode: 502,
        code: "EPOST_PREVIEW_ID_MISSING",
        message: "ePost preview creation did not return an id.",
        userMessage: "The postal provider did not return a usable quote.",
        userAction: "Please retry in a moment.",
      });
    }

    return {
      previewId,
      preview: await this.pollPreviewResult(previewId),
    };
  }

  async quoteReferencePrice(input: DispatchPricingInput): Promise<{
    providerQuotedCents: number;
    providerQuoteReference: string | null;
    quotedAt: Date | null;
  }> {
    const attachmentHandling = getAttachmentHandling(
      input.attachmentMode === "single_hint" ? 1 : 0,
      this.capabilities.attachmentPolicy,
    );

    if (attachmentHandling === "unverified") {
      throw createAttachmentLimitError(this.capabilities.attachmentPolicy);
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

    const request = createJsonFormData({
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

    const { previewId, preview } = await this.createPricingPreview(request);
    const { pricePreview, physicalPrice, providerQuotedCents } =
      extractPhysicalPreviewPrice(preview);

    if (providerQuotedCents === null) {
      throw new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_REFERENCE_PRICING_UNAVAILABLE",
        message:
          extractErrorMessage(physicalPrice) ??
          extractErrorMessage(pricePreview) ??
          "ePost preview did not return a usable stored reference price.",
        userMessage: "Stored postal pricing could not be refreshed.",
        userAction: "Retry the pricing sync after the provider is available again.",
      });
    }

    return {
      providerQuotedCents,
      providerQuoteReference: previewId,
      quotedAt: null,
    };
  }

  async quotePrice(dispatchPackage: DispatchPackage): Promise<DispatchQuote> {
    const capabilities = this.getCapabilities();
    validatePackage(dispatchPackage, capabilities);

    const attachmentHandling = getAttachmentHandling(
      dispatchPackage.attachments.length,
      capabilities.attachmentPolicy,
    );
    const request = createJsonFormData({
      fileMetadata: [
        buildDocumentMetadata(dispatchPackage, { preview: true }, capabilities),
      ],
    });

    const { previewId, preview } = await this.createPricingPreview(request);
    const { pricePreview, physicalPrice, providerQuotedCents } =
      extractPhysicalPreviewPrice(preview);

    if (providerQuotedCents === null) {
      throw new AppError({
        family: "dispatch_rejection",
        statusCode: 422,
        code: "EPOST_PHYSICAL_PRICE_UNAVAILABLE",
        message:
          extractErrorMessage(physicalPrice) ??
          extractErrorMessage(pricePreview) ??
          "ePost preview did not return a physical-letter price.",
        userMessage: "The postal provider could not quote this physical delivery.",
        userAction: "Check the letter details and retry.",
      });
    }

    const swissMailMarkupCents =
      dispatchPackage.deliveryType === "registered"
        ? env().PRICE_REGISTERED_MARKUP_CENTS
        : env().PRICE_STANDARD_MARKUP_CENTS;
    const totalCents = providerQuotedCents + swissMailMarkupCents;

    return DispatchQuoteSchema.parse({
      draftId: dispatchPackage.draftId,
      snapshotId: dispatchPackage.snapshotId,
      deliveryType: dispatchPackage.deliveryType,
      providerQuotedCents,
      swissMailMarkupCents,
      totalCents,
      currency: "CHF",
      providerQuoteReference: previewId,
      attachmentHandling,
      lineItems: [
        {
          label: "ePost provider quote",
          amountCents: providerQuotedCents,
          source: "provider",
        },
        {
          label: "Sendly service",
          amountCents: swissMailMarkupCents,
          source: "swiss_mail",
        },
      ],
    });
  }

  async submit(dispatchPackage: DispatchPackage): Promise<DispatchSubmitResult> {
    const capabilities = this.getCapabilities();
    validatePackage(dispatchPackage, capabilities);

    if (this.submissionMode === "mock") {
      return submitMockEpostDelivery(dispatchPackage);
    }

    const form = createJsonFormData({
      fileMetadata: [
        buildDocumentMetadata(dispatchPackage, { preview: false }, capabilities),
      ],
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

    const response = (await this.requestJson(
      "/epost/v2/synchronous-deliveries",
      {
        method: "POST",
        body: form,
      },
      "synchronous delivery",
    )) as JsonRecord;

    return DispatchSubmitResultSchema.parse({
      state: mapDeliveryStatus(response.status),
      providerReference:
        typeof response.deliveryId === "string"
          ? response.deliveryId
          : typeof response.deliveryId === "number"
            ? String(response.deliveryId)
            : null,
      trackingNumber: findFirstTrackingNumber(response),
      failureReason: extractErrorMessage(response),
    });
  }

  async checkStatus(providerReference: string): Promise<DispatchStatusLookup> {
    if (isMockEpostProviderReference(providerReference)) {
      return lookupMockEpostStatus(providerReference);
    }

    const response = (await this.requestJson(
      `/epost/v2/deliveries/${providerReference}/status`,
      { method: "GET" },
      "delivery status",
    )) as JsonRecord;

    return DispatchStatusLookupSchema.parse({
      state: mapStatusLookup(response.status),
      providerReference,
      trackingNumber: findFirstTrackingNumber(response),
      failureReason: extractErrorMessage(response),
      checkedAt: new Date(),
    });
  }
}
