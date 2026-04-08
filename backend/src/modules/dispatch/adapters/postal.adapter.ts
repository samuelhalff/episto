import type {
  DispatchPackage,
  DispatchProviderCapabilities,
  DispatchQuote,
  DispatchStatusLookup,
  DispatchSubmitResult,
} from "@swiss-mail/shared";

import { AppError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";
import { EpostDispatchAdapter } from "./epost.adapter.js";
import {
  getEpostDispatchCapabilities,
  getStubDispatchCapabilities,
} from "./provider-capabilities.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchAdapter {
  getCapabilities(): DispatchProviderCapabilities;
  quoteReferencePrice(input: DispatchPricingInput): Promise<{
    providerQuotedCents: number;
    providerQuoteReference: string | null;
    quotedAt: Date | null;
  }>;
  quotePrice(dispatchPackage: DispatchPackage): Promise<DispatchQuote>;
  submit(dispatchPackage: DispatchPackage): Promise<DispatchSubmitResult>;
  checkStatus(providerReference: string): Promise<DispatchStatusLookup>;
}

// ---------------------------------------------------------------------------
// Stub adapter — postal provider integration pending
// ---------------------------------------------------------------------------

class StubDispatchAdapter implements DispatchAdapter {
  getCapabilities(): DispatchProviderCapabilities {
    return getStubDispatchCapabilities();
  }

  async quoteReferencePrice(): Promise<never> {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message:
        "Postal reference pricing is unavailable because the dispatch adapter is running in stub mode.",
      userMessage: "Stored postal pricing is unavailable in this environment.",
      userAction: "Use an environment with postal dispatch enabled.",
    });
  }

  async quotePrice(): Promise<DispatchQuote> {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal quote adapter is running in stub mode without a live provider.",
      userMessage: "Live postal pricing is unavailable in this environment.",
      userAction: "Use an environment with postal dispatch enabled.",
    });
  }

  async submit(): Promise<DispatchSubmitResult> {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal dispatch adapter is running in stub mode without a live provider.",
      userMessage: "Letter dispatch is unavailable in this environment.",
      userAction: "Use an environment with postal dispatch enabled.",
    });
  }

  async checkStatus(): Promise<DispatchStatusLookup> {
    throw new AppError({
      family: "tracking_unavailable",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal dispatch adapter is running in stub mode without a live provider.",
      userMessage: "Dispatch status checking is unavailable in this environment.",
      userAction: "Use an environment with postal dispatch enabled.",
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createEpostDispatchAdapter(): DispatchAdapter {
  const adapter = new EpostDispatchAdapter(getEpostDispatchCapabilities());

  return {
    getCapabilities: () => adapter.getCapabilities(),
    quoteReferencePrice: async () => {
      throw new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_REFERENCE_PRICING_UNAVAILABLE",
        message:
          "Postal reference pricing is unavailable because the ePost reference-pricing probe is not implemented in this task.",
        userMessage: "Stored postal pricing is unavailable in this environment.",
        userAction: "Complete the ePost reference-pricing implementation before running pricing sync.",
      });
    },
    quotePrice: (dispatchPackage) => adapter.quotePrice(dispatchPackage),
    submit: (dispatchPackage) => adapter.submit(dispatchPackage),
    checkStatus: (providerReference) => adapter.checkStatus(providerReference),
  };
}

let _adapter: DispatchAdapter | undefined;

export function getDispatchAdapter(): DispatchAdapter {
  if (_adapter) return _adapter;
  _adapter =
    env().POSTAL_DISPATCH_PROVIDER === "epost"
      ? createEpostDispatchAdapter()
      : new StubDispatchAdapter();
  return _adapter;
}

/** Override the adapter (useful for testing or when a real provider is configured). */
export function setDispatchAdapter(adapter: DispatchAdapter): void {
  _adapter = adapter;
}
