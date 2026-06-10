import { describe, expect, it } from "vitest";
import {
  OrderFulfillmentStatus,
  canTransitionFulfillment,
  assertTransitionFulfillment,
} from "@episto/shared";

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
      assertTransitionFulfillment("preview_ready", "dispatch_confirmed"),
    ).toThrow("Invalid fulfillment transition");
  });
});
