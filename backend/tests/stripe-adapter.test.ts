import { beforeEach, describe, expect, it, vi } from "vitest";

const paymentIntentsCreate = vi.fn();
const paymentIntentsUpdate = vi.fn();

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
      update: paymentIntentsUpdate,
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
      customerEmail: "payer@example.com",
      orderRef: "EP-ORDER-1",
      deliveryType: "standard",
    });

    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 625,
        receipt_email: "payer@example.com",
        description: "Swiss Mail order EP-ORDER-1",
        metadata: {
          draftId: "draft-1",
          sessionId: "session-1",
          paymentAttemptId: "payment-1",
          orderRef: "EP-ORDER-1",
          deliveryType: "standard",
        },
      }),
      { idempotencyKey: "payment-1" },
    );
  });

  it("passes receipt_email and a customer-visible order description on create", async () => {
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
      customerEmail: "payer@example.com",
      orderRef: "EP-ORDER-1",
      deliveryType: "standard",
    });

    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt_email: "payer@example.com",
        description: "Swiss Mail order EP-ORDER-1",
        metadata: expect.objectContaining({
          orderRef: "EP-ORDER-1",
          deliveryType: "standard",
        }),
      }),
      { idempotencyKey: "payment-1" },
    );
  });

  it("updates receipt details on a reused pending intent", async () => {
    paymentIntentsUpdate.mockResolvedValue({ id: "pi_existing" });

    const { updatePaymentIntentReceiptDetails } = await import(
      "../src/modules/payments/adapters/stripe.adapter.js"
    );

    await updatePaymentIntentReceiptDetails("pi_existing", {
      customerEmail: "payer@example.com",
      orderRef: "EP-ORDER-1",
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "payment-1",
      deliveryType: "registered",
    });

    expect(paymentIntentsUpdate).toHaveBeenCalledWith(
      "pi_existing",
      expect.objectContaining({
        receipt_email: "payer@example.com",
        description: "Swiss Mail order EP-ORDER-1",
        metadata: expect.objectContaining({
          orderRef: "EP-ORDER-1",
          deliveryType: "registered",
        }),
      }),
    );
  });
});
