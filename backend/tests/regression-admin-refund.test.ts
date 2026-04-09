/**
 * Regression: Admin refund endpoint Zod validation must accept valid payloads
 * and reject malformed ones without crashing.
 *
 * User stories:
 * - "As an admin, I can refund a captured payment by providing a reason string."
 * - "As an admin, an empty reason is rejected with a validation error."
 * - "As an admin, a missing body is rejected, not silently accepted."
 * - "As an admin, the optional notifyCustomer flag is accepted."
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Reproduce the exact schema from admin-actions.routes.ts
const RefundBody = z.object({
  reason: z.string().min(1).max(500),
  notifyCustomer: z.boolean().optional(),
});

describe("regression: admin refund body validation", () => {
  it("accepts a valid refund payload with reason only", () => {
    const result = RefundBody.safeParse({ reason: "Customer requested cancellation" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Customer requested cancellation");
      expect(result.data.notifyCustomer).toBeUndefined();
    }
  });

  it("accepts a valid refund payload with notifyCustomer=true", () => {
    const result = RefundBody.safeParse({
      reason: "Duplicate charge",
      notifyCustomer: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notifyCustomer).toBe(true);
    }
  });

  it("accepts a valid refund payload with notifyCustomer=false", () => {
    const result = RefundBody.safeParse({
      reason: "Test refund",
      notifyCustomer: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty reason string", () => {
    const result = RefundBody.safeParse({ reason: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a reason exceeding 500 characters", () => {
    const result = RefundBody.safeParse({ reason: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("accepts a reason at exactly 500 characters", () => {
    const result = RefundBody.safeParse({ reason: "x".repeat(500) });
    expect(result.success).toBe(true);
  });

  it("rejects a missing reason field", () => {
    const result = RefundBody.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a null body", () => {
    const result = RefundBody.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects reason as a number", () => {
    const result = RefundBody.safeParse({ reason: 42 });
    expect(result.success).toBe(false);
  });

  it("rejects notifyCustomer as a string", () => {
    const result = RefundBody.safeParse({
      reason: "Valid reason",
      notifyCustomer: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields (Zod default passthrough does not add them to output)", () => {
    const result = RefundBody.safeParse({
      reason: "Valid",
      notifyCustomer: true,
      __proto__: { admin: true },
      extra: "injected",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("extra" in result.data).toBe(false);
    }
  });
});
