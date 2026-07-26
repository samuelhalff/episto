import { describe, it, expect } from "vitest";
import {
  canTransitionPayment,
  assertTransitionPayment,
  PaymentState,
} from "@episto/shared";

// ---------------------------------------------------------------------------
// Payment state machine — variant-based tests from real user stories
// ---------------------------------------------------------------------------

describe("Payment state machine — happy path", () => {
  it("allows pending → captured (automatic capture via Stripe)", () => {
    expect(canTransitionPayment("pending", "captured")).toBe(true);
  });

  it("allows pending → authorized → captured (manual capture)", () => {
    expect(canTransitionPayment("pending", "authorized")).toBe(true);
    expect(canTransitionPayment("authorized", "captured")).toBe(true);
  });

  it("allows captured → refund_pending → refunded (full refund)", () => {
    expect(canTransitionPayment("captured", "refund_pending")).toBe(true);
    expect(canTransitionPayment("refund_pending", "refunded")).toBe(true);
  });

  it("allows captured → refund_pending → partially_refunded", () => {
    expect(canTransitionPayment("captured", "refund_pending")).toBe(true);
    expect(canTransitionPayment("refund_pending", "partially_refunded")).toBe(true);
  });
});

describe("Payment state machine — failure paths", () => {
  it("allows pending → failed", () => {
    expect(canTransitionPayment("pending", "failed")).toBe(true);
  });

  it("allows pending → cancelled", () => {
    expect(canTransitionPayment("pending", "cancelled")).toBe(true);
  });

  it("allows authorized → failed", () => {
    expect(canTransitionPayment("authorized", "failed")).toBe(true);
  });

  it("allows authorized → cancelled", () => {
    expect(canTransitionPayment("authorized", "cancelled")).toBe(true);
  });

  it("failed is terminal", () => {
    for (const state of Object.values(PaymentState)) {
      expect(canTransitionPayment("failed", state)).toBe(false);
    }
  });

  it("cancelled is terminal", () => {
    for (const state of Object.values(PaymentState)) {
      expect(canTransitionPayment("cancelled", state)).toBe(false);
    }
  });

  it("refunded is terminal", () => {
    for (const state of Object.values(PaymentState)) {
      expect(canTransitionPayment("refunded", state)).toBe(false);
    }
  });
});

describe("Payment state machine — invalid transitions", () => {
  it("allows captured → refunded directly (a Stripe refund can succeed immediately)", () => {
    expect(canTransitionPayment("captured", "refunded")).toBe(true);
  });

  it("cannot go backwards from captured to pending", () => {
    expect(canTransitionPayment("captured", "pending")).toBe(false);
  });

  it("cannot skip from pending to refund_pending", () => {
    expect(canTransitionPayment("pending", "refund_pending")).toBe(false);
  });

  it("assertTransitionPayment throws on invalid transition", () => {
    expect(() => assertTransitionPayment("failed", "captured")).toThrow(
      "Invalid payment transition",
    );
  });
});

describe("Payment state machine — webhook retry safety", () => {
  it("allows duplicate captured events (idempotency in payment.service.ts handles this)", () => {
    // The state machine itself would reject captured → captured,
    // but payment.service.ts returns early when already in target state.
    expect(canTransitionPayment("captured", "captured")).toBe(false);
  });

  it("a failed refund returns refund_pending → captured, never to 'failed'", () => {
    expect(canTransitionPayment("refund_pending", "captured")).toBe(true);
    expect(canTransitionPayment("refund_pending", "failed")).toBe(false);
  });
});
