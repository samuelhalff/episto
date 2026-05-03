import type {
  SwissSignCreateSignatureSessionRequest,
  SwissSignCreateSignatureSessionResponse,
  SwissSignEligibilityRequest,
  SwissSignEligibilityResponse,
  SwissSignFetchSignedDocumentRequest,
  SwissSignFetchSignedDocumentResponse,
  SwissSignGetSignatureSessionRequest,
  SwissSignGetSignatureSessionResponse,
  SwissSignHandleSignatureCallbackRequest,
  SwissSignHandleSignatureCallbackResponse,
} from "./swisssign.types.js";

export interface SwissSignSignatureProvider {
  checkEligibility(
    request: SwissSignEligibilityRequest,
  ): Promise<SwissSignEligibilityResponse>;
  createSignatureSession(
    request: SwissSignCreateSignatureSessionRequest,
  ): Promise<SwissSignCreateSignatureSessionResponse>;
  getSignatureSession(
    request: SwissSignGetSignatureSessionRequest,
  ): Promise<SwissSignGetSignatureSessionResponse>;
  handleSignatureCallback(
    request: SwissSignHandleSignatureCallbackRequest,
  ): Promise<SwissSignHandleSignatureCallbackResponse>;
  fetchSignedDocument(
    request: SwissSignFetchSignedDocumentRequest,
  ): Promise<SwissSignFetchSignedDocumentResponse>;
}
