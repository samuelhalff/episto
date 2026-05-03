import type {
  SignatureEligibilityReasonValue,
  SignatureEligibilityStatusValue,
  SignatureFlowModeValue,
  SignatureSessionStatusValue,
} from "@episto/shared";

export interface SwissSignEligibilityRequest {
  draftId: string;
  signatureFlowMode: SignatureFlowModeValue;
  locale: string;
}

export interface SwissSignEligibilityResponse {
  status: SignatureEligibilityStatusValue;
  reasons: SignatureEligibilityReasonValue[];
  canContinue: boolean;
  checkedAt: Date;
}

export interface SwissSignCreateSignatureSessionRequest {
  signatureSessionId: string;
  draftId: string;
  signatureFlowMode: SignatureFlowModeValue;
  locale: string;
  returnUrl: string;
  callbackUrl: string;
  renderedPdfAssetId: string;
  renderedPdfFilename: string;
  signerDisplayName: string;
  signerEmail: string | null;
}

export interface SwissSignCreateSignatureSessionResponse {
  providerSessionId: string;
  status: SignatureSessionStatusValue;
  handoffUrl: string | null;
  expiresAt: Date | null;
  metadata?: Record<string, unknown>;
}

export interface SwissSignGetSignatureSessionRequest {
  providerSessionId: string;
}

export interface SwissSignGetSignatureSessionResponse {
  providerSessionId: string;
  status: SignatureSessionStatusValue;
  handoffUrl: string | null;
  expiresAt: Date | null;
  failureReason: string | null;
}

export interface SwissSignHandleSignatureCallbackRequest {
  headers: Record<string, string | string[] | undefined>;
  payload: unknown;
  rawBody: string;
}

export interface SwissSignHandleSignatureCallbackResponse {
  eventKey: string;
  providerSessionId: string;
  status: SignatureSessionStatusValue;
  signedDocumentToken: string | null;
  receivedAt: Date;
  payload: unknown;
}

export interface SwissSignFetchSignedDocumentRequest {
  providerSessionId: string;
  signedDocumentToken: string;
}

export interface SwissSignFetchSignedDocumentResponse {
  providerSessionId: string;
  fileName: string;
  mimeType: "application/pdf";
  bytes: Uint8Array;
}
