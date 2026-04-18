import type {
  SignatureAssuranceLevelValue,
  SignatureJurisdictionValue,
  SigningProviderValue,
  IdentVerificationMethodValue,
} from "@swiss-mail/shared";

import { AppError } from "../../../shared/errors/index.js";

// ---------------------------------------------------------------------------
// Phase 0 adapter seam for qualified electronic signatures.
//
// Spec: docs/04-product/qualified-signatures.md
// Decision record: docs/08-guardrails/open-decisions.md (QES provider path)
//
// This file defines the provider-agnostic interface and a stub that fails
// loudly. No module currently calls into it — Phase 0 is taxonomy + seam
// only. Phase 1 wires the platform AES adapter. Phase 2 wires Skribble.
// ---------------------------------------------------------------------------

export interface SignerIdentity {
  displayName: string;
  email: string;
  phoneE164: string | null;
  jurisdiction: SignatureJurisdictionValue;
}

export interface IdentVerificationRequest {
  signer: SignerIdentity;
  returnUrl: string;
  locale: string;
}

export interface IdentVerificationSession {
  providerSessionId: string;
  verificationUrl: string;
  expiresAt: Date;
  method: IdentVerificationMethodValue;
}

export interface IdentVerificationResult {
  providerSessionId: string;
  verified: boolean;
  verifiedAt: Date | null;
  method: IdentVerificationMethodValue;
  providerIdentityReference: string | null;
}

export interface SigningRequest {
  documentPdfBytes: Uint8Array;
  documentPdfSha256: string;
  signer: SignerIdentity;
  assuranceLevel: SignatureAssuranceLevelValue;
  providerIdentityReference: string | null;
  returnUrl: string;
  locale: string;
}

export interface SigningSessionHandle {
  providerSessionId: string;
  signingUrl: string | null;
  expiresAt: Date;
}

export interface SignedArtifact {
  providerSessionId: string;
  signedPdfBytes: Uint8Array;
  signedPdfSha256: string;
  originalPdfSha256: string;
  certificateSubjectDn: string;
  certificateSerial: string;
  certificateIssuerDn: string;
  signedAt: Date;
  timestampAuthorityUrl: string | null;
  ltvEmbedded: boolean;
  verificationUrl: string;
}

export interface SigningAdapterCapabilities {
  provider: SigningProviderValue;
  supportsAdvanced: boolean;
  supportsQualified: boolean;
  supportsEidas: boolean;
  supportsZertes: boolean;
  supportsIdentReuse: boolean;
}

export interface SigningAdapter {
  getCapabilities(): SigningAdapterCapabilities;
  createIdentVerification(
    request: IdentVerificationRequest,
  ): Promise<IdentVerificationSession>;
  getIdentVerification(providerSessionId: string): Promise<IdentVerificationResult>;
  createSigningSession(request: SigningRequest): Promise<SigningSessionHandle>;
  getSignedArtifact(providerSessionId: string): Promise<SignedArtifact>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}

// ---------------------------------------------------------------------------
// Stub adapter — signing provider integration pending.
// ---------------------------------------------------------------------------

class StubSigningAdapter implements SigningAdapter {
  getCapabilities(): SigningAdapterCapabilities {
    return {
      provider: "none",
      supportsAdvanced: false,
      supportsQualified: false,
      supportsEidas: false,
      supportsZertes: false,
      supportsIdentReuse: false,
    };
  }

  async createIdentVerification(): Promise<IdentVerificationSession> {
    throw this.notConfigured("Identity verification");
  }

  async getIdentVerification(): Promise<IdentVerificationResult> {
    throw this.notConfigured("Identity verification lookup");
  }

  async createSigningSession(): Promise<SigningSessionHandle> {
    throw this.notConfigured("Signing session creation");
  }

  async getSignedArtifact(): Promise<SignedArtifact> {
    throw this.notConfigured("Signed artifact retrieval");
  }

  verifyWebhookSignature(): boolean {
    return false;
  }

  private notConfigured(operation: string): AppError {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "SIGNING_ADAPTER_NOT_CONFIGURED",
      message: `${operation} is unavailable because the signing adapter is running in stub mode.`,
      userMessage: "Qualified signing is not available in this environment.",
      userAction: "Select a non-qualified signature or contact support.",
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _adapter: SigningAdapter | undefined;

export function getSigningAdapter(): SigningAdapter {
  if (_adapter) return _adapter;
  _adapter = new StubSigningAdapter();
  return _adapter;
}

export function setSigningAdapter(adapter: SigningAdapter): void {
  _adapter = adapter;
}
