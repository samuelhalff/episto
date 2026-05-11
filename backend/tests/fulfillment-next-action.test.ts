import { describe, expect, it } from "vitest";
import { resolveDraftFulfillmentNextAction } from "../src/modules/signing/fulfillment-response.service.js";

describe("draft fulfillment next action", () => {
  it("routes SwissSign drafts without an eligibility session to the gate", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "ready_to_sign",
        signatureFlowMode: "swisssign_ses",
        fulfillmentStatus: "signature_selected",
        payment: null,
        dispatch: null,
        signatureSession: null,
      }),
    ).toBe("eligibility_gate");
  });

  it("routes authorized SwissSign drafts with an open handoff to resume", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "ready_to_sign",
        signatureFlowMode: "swisssign_ses",
        fulfillmentStatus: "signature_session_created",
        payment: {
          state: "authorized",
          priceCents: 625,
          currency: "CHF",
          capturedAt: null,
          refundedAt: null,
        },
        dispatch: null,
        signatureSession: {
          id: "session-1",
          draftId: "draft-1",
          sessionId: "browser-session-1",
          paymentAttemptId: "payment-1",
          signatureFlowMode: "swisssign_ses",
          provider: "swisssign_mock",
          eligibilityStatus: "conditionally_eligible",
          eligibilityReasons: ["swissid_required"],
          status: "signature_in_progress",
          providerSessionId: "provider-session-1",
          handoffUrl: "https://example.com/handoff",
          oidcState: null,
          oidcNonce: null,
          pkceCodeVerifier: null,
          signedFileAssetId: null,
          failureReason: null,
          expiresAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date("2026-04-21T00:00:00Z"),
          updatedAt: new Date("2026-04-21T00:00:00Z"),
        },
      }),
    ).toBe("resume_signature");
  });

  it("keeps signed but not yet dispatched SwissSign drafts on the pending screen", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "ready_to_sign",
        signatureFlowMode: "swisssign_ses",
        fulfillmentStatus: "payment_captured",
        payment: {
          state: "captured",
          priceCents: 625,
          currency: "CHF",
          capturedAt: "2026-04-21T00:00:00.000Z",
          refundedAt: null,
        },
        dispatch: null,
        signatureSession: {
          id: "session-1",
          draftId: "draft-1",
          sessionId: "browser-session-1",
          paymentAttemptId: "payment-1",
          signatureFlowMode: "swisssign_ses",
          provider: "swisssign_mock",
          eligibilityStatus: "conditionally_eligible",
          eligibilityReasons: ["swissid_required"],
          status: "signed_document_attached",
          providerSessionId: "provider-session-1",
          handoffUrl: null,
          oidcState: null,
          oidcNonce: null,
          pkceCodeVerifier: null,
          signedFileAssetId: "signed-pdf-1",
          failureReason: null,
          expiresAt: null,
          completedAt: new Date("2026-04-21T00:00:00Z"),
          metadata: null,
          createdAt: new Date("2026-04-21T00:00:00Z"),
          updatedAt: new Date("2026-04-21T00:00:00Z"),
        },
      }),
    ).toBe("await_dispatch");
  });

  it("only shows confirmation once dispatch is accepted", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "dispatched",
        signatureFlowMode: "visual",
        fulfillmentStatus: "completed",
        payment: {
          state: "captured",
          priceCents: 625,
          currency: "CHF",
          capturedAt: "2026-04-21T00:00:00.000Z",
          refundedAt: null,
        },
        dispatch: {
          state: "accepted",
          providerRef: "dispatch-1",
          providerMode: "mock",
          trackingNumber: null,
          submittedAt: "2026-04-21T00:00:00.000Z",
          acceptedAt: "2026-04-21T00:01:00.000Z",
          rejectedAt: null,
          trackingAvailable: false,
          lastCheckedAt: "2026-04-21T00:01:00.000Z",
        },
        signatureSession: null,
      }),
    ).toBe("view_confirmation");
  });
});
