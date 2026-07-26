/**
 * Regression: Stripe adapter safety gate must NOT block legitimate test-mode usage.
 *
 * User story: "As a developer, I can still create payments, retrieve intents,
 * and process refunds using sk_test_* keys in development/test environments."
 *
 * Risk: The new assertStripeEnvironmentSafety() gate in getStripe() could
 * accidentally reject valid test keys or break the Stripe singleton lifecycle.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  envData: {
    STRIPE_SECRET_KEY: "sk_test_abc123",
    STRIPE_WEBHOOK_SECRET: "whsec_test_xyz",
    NODE_ENV: "development" as string,
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => mocks.envData,
}));

// Prevent real Stripe client instantiation
vi.mock("stripe", () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
      }),
      retrieve: vi.fn().mockResolvedValue({
        status: "succeeded",
        client_secret: "pi_test_123_secret",
        latest_charge: "ch_test_456",
      }),
      capture: vi.fn().mockResolvedValue({
        latest_charge: "ch_test_789",
      }),
      cancel: vi.fn().mockResolvedValue({}),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: "re_test_001",
        charge: "ch_test_1",
        amount: 455,
        currency: "chf",
        status: "succeeded",
        created: 1_780_000_000,
        balance_transaction: null,
        failure_reason: null,
      }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: "payment_intent.succeeded" }),
    },
  }));
  return { default: MockStripe, Stripe: MockStripe };
});

describe("regression: Stripe safety gate preserves test-mode functionality", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.envData.STRIPE_SECRET_KEY = "sk_test_abc123";
    mocks.envData.STRIPE_WEBHOOK_SECRET = "whsec_test_xyz";
    mocks.envData.NODE_ENV = "development";
  });

  it("isLiveStripeKey returns false for sk_test_ keys", async () => {
    const { isLiveStripeKey } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(isLiveStripeKey("sk_test_abc123")).toBe(false);
  });

  it("isLiveStripeKey returns true for sk_live_ keys", async () => {
    const { isLiveStripeKey } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(isLiveStripeKey("sk_live_abc123")).toBe(true);
  });

  it("isLiveStripeKey returns true for rk_live_ keys", async () => {
    const { isLiveStripeKey } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(isLiveStripeKey("rk_live_abc123")).toBe(true);
  });

  it("assertStripeEnvironmentSafety passes with test key in development", async () => {
    const { assertStripeEnvironmentSafety } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(() => assertStripeEnvironmentSafety()).not.toThrow();
  });

  it("assertStripeEnvironmentSafety passes with test key in test env", async () => {
    mocks.envData.NODE_ENV = "test";
    const { assertStripeEnvironmentSafety } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(() => assertStripeEnvironmentSafety()).not.toThrow();
  });

  it("assertStripeEnvironmentSafety passes with live key in production", async () => {
    mocks.envData.STRIPE_SECRET_KEY = "sk_live_real";
    mocks.envData.NODE_ENV = "production";
    const { assertStripeEnvironmentSafety } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(() => assertStripeEnvironmentSafety()).not.toThrow();
  });

  it("assertStripeEnvironmentSafety blocks live key in development", async () => {
    mocks.envData.STRIPE_SECRET_KEY = "sk_live_real";
    mocks.envData.NODE_ENV = "development";
    const { assertStripeEnvironmentSafety } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(() => assertStripeEnvironmentSafety()).toThrow(/Live Stripe key detected/);
  });

  it("assertStripeEnvironmentSafety blocks rk_live_ key in test env", async () => {
    mocks.envData.STRIPE_SECRET_KEY = "rk_live_restricted";
    mocks.envData.NODE_ENV = "test";
    const { assertStripeEnvironmentSafety } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    expect(() => assertStripeEnvironmentSafety()).toThrow(/Live Stripe key detected/);
  });

  it("createPaymentIntent still works with test keys", async () => {
    const { createPaymentIntent } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    const result = await createPaymentIntent(490, {
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "pa-1",
      customerEmail: "payer@example.com",
      orderRef: "EP-DRAFT-1",
      deliveryType: "standard",
    });
    expect(result.paymentIntentId).toBe("pi_test_123");
    expect(result.clientSecret).toBe("pi_test_123_secret");
  });

  it("createRefund still works with test keys", async () => {
    const { createRefund } =
      await import("../src/modules/payments/adapters/stripe.adapter.js");
    const result = await createRefund("pi_test_123", {
      reason: "customer request",
      idempotencyKey: "test-key-1",
    });
    expect(result.refundId).toBe("re_test_001");
  });
});
