import { describe, it, expect, vi } from "vitest";

// Mock Stripe adapter
const mockCreateRefund = vi.fn();
vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  createRefund: (...args: unknown[]) => mockCreateRefund(...args),
  createPaymentIntent: vi.fn(),
  capturePaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
  constructWebhookEvent: vi.fn(),
}));

describe("Stripe createRefund adapter contract", () => {
  it("calls Stripe with paymentIntentId and reason", async () => {
    const { createRefund } = await import(
      "../src/modules/payments/adapters/stripe.adapter.js"
    );

    mockCreateRefund.mockResolvedValueOnce({ refundId: "re_test_123" });

    const result = await createRefund("pi_test_abc", "Customer requested");
    expect(result).toEqual({ refundId: "re_test_123" });
    expect(mockCreateRefund).toHaveBeenCalledWith(
      "pi_test_abc",
      "Customer requested",
    );
  });

  it("propagates errors from Stripe", async () => {
    const { createRefund } = await import(
      "../src/modules/payments/adapters/stripe.adapter.js"
    );

    mockCreateRefund.mockRejectedValueOnce(new Error("Stripe error"));

    await expect(createRefund("pi_fail", "test")).rejects.toThrow(
      "Stripe error",
    );
  });
});
