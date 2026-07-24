import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "./assert-defined";

const paymentIntentsCreate = vi.fn();
const paymentIntentsUpdate = vi.fn();
const accountsRetrieve = vi.fn();

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

    accounts = {
      retrieve: accountsRetrieve,
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
    accountsRetrieve.mockResolvedValue({
      capabilities: {
        card_payments: "active",
        twint_payments: "active",
        link_payments: "active",
      },
    });
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
        payment_method_types: ["card", "twint", "link"],
        metadata: expect.objectContaining({
          draftId: "draft-1",
          sessionId: "session-1",
          paymentAttemptId: "payment-1",
        }),
      }),
      { idempotencyKey: "payment-1" },
    );
  });

  it("offers only allowlisted, currently-active methods (no TWINT while pending, never Klarna)", async () => {
    accountsRetrieve.mockResolvedValue({
      capabilities: {
        card_payments: "active",
        twint_payments: "pending",
        link_payments: "active",
        klarna_payments: "active",
        amazon_pay_payments: "active",
      },
    });
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

    // TWINT is pending → excluded (no whole-intent rejection); Klarna/Amazon Pay
    // are active on the account but never offered because they are not allowlisted.
    expect(createPayload).toHaveProperty("payment_method_types", ["card", "link"]);
    expect(createPayload).not.toHaveProperty("automatic_payment_methods");
  });

  it("falls back to card only when the account lookup fails", async () => {
    accountsRetrieve.mockRejectedValue(new Error("network"));
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
    expect(createPayload).toHaveProperty("payment_method_types", ["card"]);
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
