import { describe, expect, it } from "vitest";
import {
  SignatureSessionStatus,
  OrderFulfillmentStatus,
  canTransitionSignatureSession,
  canTransitionFulfillment,
  assertTransitionSignatureSession,
  assertTransitionFulfillment,
} from "@episto/shared";

describe("Signature session state machine", () => {
  it("allows the SwissSign signing happy path with identity step-up", () => {
    expect(
      canTransitionSignatureSession("eligibility_confirmed", "payment_authorized"),
    ).toBe(true);
    expect(
      canTransitionSignatureSession("payment_authorized", "identity_stepup_started"),
    ).toBe(true);
    expect(
      canTransitionSignatureSession(
        "identity_stepup_started",
        "signature_session_created",
      ),
    ).toBe(true);
    expect(
      canTransitionSignatureSession("signature_session_created", "signature_in_progress"),
    ).toBe(true);
    expect(
      canTransitionSignatureSession("signature_in_progress", "signature_completed"),
    ).toBe(true);
    expect(
      canTransitionSignatureSession("signature_completed", "signed_document_attached"),
    ).toBe(true);
  });

  it("allows skipping step-up when the signer is already ready", () => {
    expect(
      canTransitionSignatureSession("payment_authorized", "signature_session_created"),
    ).toBe(true);
  });

  it("keeps failed, expired, and cancelled terminal", () => {
    for (const state of Object.values(SignatureSessionStatus)) {
      expect(canTransitionSignatureSession("failed", state)).toBe(false);
      expect(canTransitionSignatureSession("expired", state)).toBe(false);
      expect(canTransitionSignatureSession("cancelled", state)).toBe(false);
    }
  });

  it("rejects invalid backwards transitions", () => {
    expect(
      canTransitionSignatureSession("signature_completed", "payment_authorized"),
    ).toBe(false);
    expect(() =>
      assertTransitionSignatureSession("signed_document_attached", "signature_completed"),
    ).toThrow("Invalid signature session transition");
  });
});

describe("Order fulfillment state machine", () => {
  it("allows the standard non-signature send path", () => {
    expect(canTransitionFulfillment("draft_created", "draft_completed")).toBe(true);
    expect(canTransitionFulfillment("draft_completed", "preview_ready")).toBe(true);
    expect(canTransitionFulfillment("preview_ready", "signature_not_required")).toBe(
      true,
    );
    expect(canTransitionFulfillment("signature_not_required", "payment_captured")).toBe(
      true,
    );
    expect(canTransitionFulfillment("payment_captured", "dispatch_submitted")).toBe(true);
    expect(canTransitionFulfillment("dispatch_submitted", "dispatch_confirmed")).toBe(
      true,
    );
    expect(canTransitionFulfillment("dispatch_confirmed", "completed")).toBe(true);
  });

  it("allows the signature-required send path", () => {
    expect(canTransitionFulfillment("preview_ready", "signature_selected")).toBe(true);
    expect(
      canTransitionFulfillment("signature_selected", "signature_eligibility_confirmed"),
    ).toBe(true);
    expect(
      canTransitionFulfillment("signature_eligibility_confirmed", "payment_authorized"),
    ).toBe(true);
    expect(
      canTransitionFulfillment("payment_authorized", "identity_stepup_started"),
    ).toBe(true);
    expect(
      canTransitionFulfillment("identity_stepup_started", "signature_session_created"),
    ).toBe(true);
    expect(
      canTransitionFulfillment("signature_session_created", "signature_in_progress"),
    ).toBe(true);
    expect(canTransitionFulfillment("signature_in_progress", "signature_completed")).toBe(
      true,
    );
    expect(
      canTransitionFulfillment("signature_completed", "signed_document_attached"),
    ).toBe(true);
    expect(canTransitionFulfillment("signed_document_attached", "payment_captured")).toBe(
      true,
    );
    expect(canTransitionFulfillment("payment_captured", "dispatch_submitted")).toBe(true);
    expect(canTransitionFulfillment("dispatch_submitted", "dispatch_confirmed")).toBe(
      true,
    );
    expect(canTransitionFulfillment("dispatch_confirmed", "completed")).toBe(true);
  });

  it("keeps completed, failed, and expired terminal", () => {
    for (const state of Object.values(OrderFulfillmentStatus)) {
      expect(canTransitionFulfillment("completed", state)).toBe(false);
      expect(canTransitionFulfillment("failed", state)).toBe(false);
      expect(canTransitionFulfillment("expired", state)).toBe(false);
    }
  });

  it("rejects invalid jumps", () => {
    expect(canTransitionFulfillment("preview_ready", "dispatch_submitted")).toBe(false);
    expect(() =>
      assertTransitionFulfillment("signature_selected", "dispatch_confirmed"),
    ).toThrow("Invalid fulfillment transition");
  });
});
