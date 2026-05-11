import type { SignatureEligibilityReasonValue } from "@episto/shared";
import { env } from "../../../shared/config/index.js";
import type { SwissSignSignatureProvider } from "./swisssign.provider.js";
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

const MOCK_PDF = new TextEncoder().encode(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 46 >>
stream
BT /F1 12 Tf 72 96 Td (Mock signed PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000063 00000 n
0000000122 00000 n
0000000209 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
305
%%EOF`,
);

function buildMockHandoffUrl(
  request: SwissSignCreateSignatureSessionRequest,
  providerSessionId: string,
): string {
  return request.returnUrl.replace(
    "/signature/return",
    `/signature/mock/${providerSessionId}`,
  );
}

export class SwissSignMockProvider implements SwissSignSignatureProvider {
  async checkEligibility(
    request: SwissSignEligibilityRequest,
  ): Promise<SwissSignEligibilityResponse> {
    void request;
    const reasons: SignatureEligibilityReasonValue[] = [
      "swissid_required",
      "signing_stepup_required",
    ];

    return {
      status: "conditionally_eligible",
      reasons,
      canContinue: true,
      checkedAt: new Date(),
    };
  }

  async createSignatureSession(
    request: SwissSignCreateSignatureSessionRequest,
  ): Promise<SwissSignCreateSignatureSessionResponse> {
    const providerSessionId = `swisssign-mock-${request.signatureSessionId}`;

    return {
      providerSessionId,
      status: "signature_session_created",
      handoffUrl: buildMockHandoffUrl(request, providerSessionId),
      expiresAt: new Date(Date.now() + env().SIGNATURE_PENDING_TTL_MINUTES * 60 * 1000),
      metadata: {
        mock: true,
      },
    };
  }

  async getSignatureSession(
    request: SwissSignGetSignatureSessionRequest,
  ): Promise<SwissSignGetSignatureSessionResponse> {
    return {
      providerSessionId: request.providerSessionId,
      status: "signature_in_progress",
      handoffUrl: null,
      expiresAt: new Date(Date.now() + env().SIGNATURE_PENDING_TTL_MINUTES * 60 * 1000),
      failureReason: null,
    };
  }

  async handleSignatureCallback(
    request: SwissSignHandleSignatureCallbackRequest,
  ): Promise<SwissSignHandleSignatureCallbackResponse> {
    const payload =
      request.payload && typeof request.payload === "object"
        ? (request.payload as {
            providerSessionId?: string;
            status?: string;
            eventKey?: string;
          })
        : {};

    const providerSessionId = payload.providerSessionId ?? "unknown-session";
    const status =
      payload.status === "completed"
        ? "signature_completed"
        : payload.status === "expired"
          ? "expired"
          : payload.status === "failed"
            ? "failed"
            : "signature_in_progress";

    return {
      eventKey:
        payload.eventKey ??
        `${providerSessionId}:${payload.status ?? "in_progress"}:${Date.now()}`,
      providerSessionId,
      status,
      signedDocumentToken:
        status === "signature_completed" ? `${providerSessionId}:signed` : null,
      receivedAt: new Date(),
      payload: request.payload,
    };
  }

  async fetchSignedDocument(
    request: SwissSignFetchSignedDocumentRequest,
  ): Promise<SwissSignFetchSignedDocumentResponse> {
    return {
      providerSessionId: request.providerSessionId,
      fileName: `${request.providerSessionId}.pdf`,
      mimeType: "application/pdf",
      bytes: MOCK_PDF,
    };
  }
}
