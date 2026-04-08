import { beforeEach, describe, expect, it, vi } from "vitest";

const paymentIntentsCreate = vi.fn();

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test_123",
  }),
}));

vi.mock("stripe", () => {
  class MockStripe {
    static errors = {
      StripeError: class StripeError extends Error {},
    };

    paymentIntents = {
      create: paymentIntentsCreate,
      retrieve: vi.fn(),
      capture: vi.fn(),
      cancel: vi.fn(),
    };

    refunds = {
      create: vi.fn(),
    };

    webhooks = {
      constructEvent: vi.fn(),
    };
  }

  return { default: MockStripe };
});

describe("createPaymentIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("passes the payment attempt id as the Stripe idempotency key", async () => {
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_test_1",
      client_secret: "cs_test_1",
    });

    const { createPaymentIntent } = await import(
      "../src/modules/payments/adapters/stripe.adapter.js"
    );

    await createPaymentIntent(625, {
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "payment-1",
    });

    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 625,
        metadata: {
          draftId: "draft-1",
          sessionId: "session-1",
          paymentAttemptId: "payment-1",
        },
      }),
      { idempotencyKey: "payment-1" },
    );
  });
});
