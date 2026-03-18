import { AppError } from "../../../shared/errors/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmitResult {
  providerReference: string;
  providerPayload: unknown;
}

export interface StatusResult {
  state: string;
  providerPayload: unknown;
}

export interface DispatchAdapter {
  submitJob(
    pdfStorageKey: string,
    recipient: { name: string; addressLine1: string; postalCode: string; city: string; country: string },
    deliveryType: string,
  ): Promise<SubmitResult>;

  checkStatus(providerReference: string): Promise<StatusResult>;
}

// ---------------------------------------------------------------------------
// Stub adapter — postal provider integration pending
// ---------------------------------------------------------------------------

class StubDispatchAdapter implements DispatchAdapter {
  async submitJob(): Promise<SubmitResult> {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal dispatch adapter not yet configured. Provider integration pending.",
      userMessage: "Letter dispatch is not yet available. Provider integration is pending.",
      userAction: "Please try again later.",
    });
  }

  async checkStatus(): Promise<StatusResult> {
    throw new AppError({
      family: "tracking_unavailable",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal dispatch adapter not yet configured. Provider integration pending.",
      userMessage: "Dispatch status checking is not yet available.",
      userAction: "Please try again later.",
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _adapter: DispatchAdapter | undefined;

export function getDispatchAdapter(): DispatchAdapter {
  if (_adapter) return _adapter;
  _adapter = new StubDispatchAdapter();
  return _adapter;
}

/** Override the adapter (useful for testing or when a real provider is configured). */
export function setDispatchAdapter(adapter: DispatchAdapter): void {
  _adapter = adapter;
}
