import { describe, expect, it } from "vitest";
import { resolveDraftFulfillmentNextAction } from "../src/modules/signing/fulfillment-response.service.js";

describe("draft fulfillment next action", () => {
  it("routes ready visual drafts without payment to checkout", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "ready",
        signatureFlowMode: "visual",
        fulfillmentStatus: "signature_not_required",
        payment: null,
        dispatch: null,
      }),
    ).toBe("checkout");
  });

  it("routes paid visual drafts to dispatch wait", () => {
    expect(
      resolveDraftFulfillmentNextAction({
        draftStatus: "ready",
        signatureFlowMode: "visual",
        fulfillmentStatus: "payment_captured",
        payment: {
          state: "captured",
          priceCents: 625,
          currency: "CHF",
          capturedAt: "2026-04-21T00:00:00.000Z",
          refundedAt: null,
        },
        dispatch: null,
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
      }),
    ).toBe("view_confirmation");
  });
});
