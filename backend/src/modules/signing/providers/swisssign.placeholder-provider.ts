import { AppError } from "../../../shared/errors/index.js";
import type { SwissSignSignatureProvider } from "./swisssign.provider.js";
import type {
  SwissSignEligibilityRequest,
  SwissSignCreateSignatureSessionRequest,
  SwissSignFetchSignedDocumentRequest,
  SwissSignGetSignatureSessionRequest,
  SwissSignHandleSignatureCallbackRequest,
} from "./swisssign.types.js";

function createUnimplementedError(operation: string): AppError {
  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "SWISSSIGN_API_UNIMPLEMENTED",
    message: `${operation} cannot run yet because the live SwissSign transaction API details are not wired.`,
    userMessage: "SwissSign is not fully configured in this environment yet.",
    userAction:
      "Use the mock integration for testing or wire the live API details first.",
  });
}

export class SwissSignPlaceholderProvider implements SwissSignSignatureProvider {
  async checkEligibility(_request: SwissSignEligibilityRequest): Promise<never> {
    throw createUnimplementedError("SwissSign eligibility check");
  }

  async createSignatureSession(
    _request: SwissSignCreateSignatureSessionRequest,
  ): Promise<never> {
    throw createUnimplementedError("SwissSign signature session creation");
  }

  async getSignatureSession(
    _request: SwissSignGetSignatureSessionRequest,
  ): Promise<never> {
    throw createUnimplementedError("SwissSign signature session lookup");
  }

  async handleSignatureCallback(
    _request: SwissSignHandleSignatureCallbackRequest,
  ): Promise<never> {
    throw createUnimplementedError("SwissSign callback handling");
  }

  async fetchSignedDocument(
    _request: SwissSignFetchSignedDocumentRequest,
  ): Promise<never> {
    throw createUnimplementedError("SwissSign signed document retrieval");
  }
}
