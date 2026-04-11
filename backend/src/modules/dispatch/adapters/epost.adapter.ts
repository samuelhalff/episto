import {
  type DispatchProviderCapabilities,
  DispatchQuoteSchema,
  DispatchStatusLookupSchema,
  DispatchSubmitResultSchema,
  type DispatchPackage,
  type DispatchQuote,
  type DispatchStatusLookup,
  type DispatchSubmitResult,
} from "@swiss-mail/shared";

import { AppError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";
import {
  getAttachmentHandling,
  getEpostDispatchCapabilities,
} from "./provider-capabilities.js";
import {
  lookupMockEpostStatus,
  submitMockEpostDelivery,
  isMockEpostProviderReference,
} from "./mock-epost-submission.js";
import { type EpostSubmissionMode } from "./epost-submission-mode.js";
import { EpostHttpClient } from "./epost-http-client.js";
import {
  createDispatchPreviewRequest,
  createReferencePricingPreviewRequest,
  createSynchronousDeliveryForm,
  validatePackage,
} from "./epost-request-builders.js";
import {
  extractErrorMessage,
  extractPhysicalPreviewPrice,
  findFirstTrackingNumber,
  mapDeliveryStatus,
  mapStatusLookup,
} from "./epost-response-mappers.js";
import type { EpostHttpClientLike } from "./epost-types.js";

interface EpostDispatchAdapterOptions {
  capabilities?: DispatchProviderCapabilities;
  submissionMode?: EpostSubmissionMode;
  httpClient?: EpostHttpClientLike;
}

export class EpostDispatchAdapter {
  private readonly capabilities: DispatchProviderCapabilities;
  private readonly submissionMode: EpostSubmissionMode;
  private readonly httpClient: EpostHttpClientLike;

  constructor(options: EpostDispatchAdapterOptions = {}) {
    this.submissionMode = options.submissionMode ?? env().EPOST_SUBMISSION_MODE;
    this.capabilities =
      options.capabilities ?? getEpostDispatchCapabilities(this.submissionMode);
    this.httpClient = options.httpClient ?? new EpostHttpClient();
  }

  getCapabilities(): DispatchProviderCapabilities {
    return this.capabilities;
  }

  async quoteReferencePrice(input: DispatchPricingInput): Promise<{
    providerQuotedCents: number;
    providerQuoteReference: string | null;
    quotedAt: Date | null;
  }> {
    const request = createReferencePricingPreviewRequest(input, this.capabilities);
    const { previewId, preview } = await this.httpClient.createPricingPreview(request);
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
    const request = createDispatchPreviewRequest(dispatchPackage, capabilities);
    const { previewId, preview } = await this.httpClient.createPricingPreview(request);
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
          label: "Episto service",
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

    const form = await createSynchronousDeliveryForm(dispatchPackage, capabilities);
    const response = (await this.httpClient.requestJson(
      "/epost/v2/synchronous-deliveries",
      {
        method: "POST",
        body: form,
      },
      "synchronous delivery",
    )) as Record<string, unknown>;

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

    const response = (await this.httpClient.requestJson(
      `/epost/v2/deliveries/${providerReference}/status`,
      { method: "GET" },
      "delivery status",
    )) as Record<string, unknown>;

    return DispatchStatusLookupSchema.parse({
      state: mapStatusLookup(response.status),
      providerReference,
      trackingNumber: findFirstTrackingNumber(response),
      failureReason: extractErrorMessage(response),
      checkedAt: new Date(),
    });
  }
}
