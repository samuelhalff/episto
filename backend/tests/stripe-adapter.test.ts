import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "./assert-defined";

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

    const { createPaymentIntent } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");

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
        currency: "chf",
        automatic_payment_methods: { enabled: true },
        metadata: expect.objectContaining({
          draftId: "draft-1",
          sessionId: "session-1",
          paymentAttemptId: "payment-1",
        }),
      }),
      { idempotencyKey: "payment-1" },
    );
  });

  it("delegates payment-method selection to the Stripe account (Dashboard-driven)", async () => {
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_test_1",
      client_secret: "cs_test_1",
    });

    const { createPaymentIntent } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");

    await createPaymentIntent(625, {
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "payment-1",
      customerEmail: "payer@example.com",
      orderRef: "EP-ORDER-1",
      deliveryType: "standard",
    });

    const [createPayload] = assertDefined(paymentIntentsCreate.mock.calls[0]);

    // Methods are controlled by the Stripe Dashboard so an inactive method
    // (e.g. TWINT pending review) never rejects the whole intent.
    expect(createPayload).toHaveProperty("automatic_payment_methods", {
      enabled: true,
    });
    expect(createPayload).not.toHaveProperty("payment_method_types");
  });

  it("passes receipt_email and a customer-visible order description on create", async () => {
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_test_1",
      client_secret: "cs_test_1",
    });

    const { createPaymentIntent } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");

    await createPaymentIntent(625, {
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "payment-1",
      customerEmail: "payer@example.com",
      orderRef: "EP-ORDER-1",
      deliveryType: "standard",
    });

    const [createPayload] = assertDefined(paymentIntentsCreate.mock.calls[0]);

    expect(createPayload).toEqual(
      expect.objectContaining({
        receipt_email: "payer@example.com",
        description: "Episto order EP-ORDER-1 (standard letter)",
        metadata: expect.objectContaining({
          orderRef: "EP-ORDER-1",
          deliveryType: "standard",
        }),
      }),
    );
  });

  it("updates receipt details on a reused pending intent", async () => {
    paymentIntentsUpdate.mockResolvedValue({ id: "pi_existing" });

    const { updatePaymentIntentReceiptDetails } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");

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
        description: "Episto order EP-ORDER-1 (registered letter)",
        metadata: expect.objectContaining({
          orderRef: "EP-ORDER-1",
          deliveryType: "registered",
        }),
      }),
    );
  });
});
