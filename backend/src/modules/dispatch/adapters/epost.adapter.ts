import {
  type DispatchProviderCapabilities,
  DispatchQuoteSchema,
  DispatchStatusLookupSchema,
  DispatchSubmitResultSchema,
  type DispatchPackage,
  type DispatchQuote,
  type DispatchStatusLookup,
  type DispatchSubmitResult,
} from "@episto/shared";

import { AppError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import { createLogger } from "../../../shared/logging/index.js";
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
import { markLetterNotSent } from "../dispatch-outcome.js";

interface EpostDispatchAdapterOptions {
  capabilities?: DispatchProviderCapabilities;
  submissionMode?: EpostSubmissionMode;
  httpClient?: EpostHttpClientLike;
}

const logger = createLogger("epost-adapter");

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
          label: "episto service",
          amountCents: swissMailMarkupCents,
          source: "swiss_mail",
        },
      ],
    });
  }

  async submit(dispatchPackage: DispatchPackage): Promise<DispatchSubmitResult> {
    const capabilities = this.getCapabilities();
    try {
      validatePackage(dispatchPackage, capabilities);
    } catch (error) {
      // Pre-flight: our own rules refused the package. Nothing was transmitted,
      // so the worker is free to refund.
      throw markLetterNotSent(error);
    }

    if (this.submissionMode === "mock") {
      // Defence in depth behind the env guard: a mock submission fakes an
      // "accepted" dispatch, so it must never run in production (it would let a
      // payment capture without a letter ever reaching Swiss Post). Read
      // process.env directly so this never depends on env() being loaded.
      if (process.env.NODE_ENV === "production") {
        throw new AppError({
          family: "provider_outage",
          statusCode: 500,
          code: "EPOST_MOCK_IN_PRODUCTION",
          message:
            "Refusing to run a mock ePost submission in production — this would charge without sending.",
          userMessage: "We could not send this letter. Please try again shortly.",
        });
      }
      return submitMockEpostDelivery(dispatchPackage);
    }

    // Minimal, PII-free context so the (never-before-exercised) first live send
    // is debuggable if ePost rejects the payload.
    const requestContext = {
      draftId: dispatchPackage.draftId,
      snapshotId: dispatchPackage.snapshotId,
      deliveryType: dispatchPackage.deliveryType,
      recipientCountry: dispatchPackage.recipient.country,
      recipientPostalCode: dispatchPackage.recipient.postalCode,
    };
    logger.info(requestContext, "Submitting live ePost synchronous delivery");

    let form;
    try {
      form = await createSynchronousDeliveryForm(dispatchPackage, capabilities);
    } catch (error) {
      // Still assembling the request — the documents could not even be read.
      logger.error(
        {
          ...requestContext,
          error: error instanceof Error ? error.message : String(error),
        },
        "Live ePost submission could not be assembled",
      );
      throw markLetterNotSent(error);
    }

    let response: Record<string, unknown>;
    try {
      response = (await this.httpClient.requestJson(
        "/epost/v2/synchronous-deliveries",
        {
          method: "POST",
          body: form,
        },
        "synchronous delivery",
      )) as Record<string, unknown>;
    } catch (error) {
      // A `dispatch_rejection` is ePost answering 400/422: it read the request
      // and refused it, so the letter demonstrably did not go out. Everything
      // else here — a timeout, a 5xx, a socket that closed — is ambiguous and
      // stays unmarked, because the letter may already be theirs.
      if (error instanceof AppError && error.family === "dispatch_rejection") {
        markLetterNotSent(error);
      }
      logger.error(
        {
          ...requestContext,
          error: error instanceof Error ? error.message : String(error),
        },
        "Live ePost submission failed",
      );
      throw error;
    }

    const result = DispatchSubmitResultSchema.parse({
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

    logger.info(
      {
        ...requestContext,
        providerReference: result.providerReference,
        state: result.state,
        hasTrackingNumber: Boolean(result.trackingNumber),
        failureReason: result.failureReason,
      },
      "Live ePost submission completed",
    );

    return result;
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
