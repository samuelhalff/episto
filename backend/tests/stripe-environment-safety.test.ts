import { describe, it, expect } from "vitest";
import { EnvSchema } from "../src/shared/config/index.js";
import { isLiveStripeKey } from "../src/modules/payments/adapters/stripe.adapter.js";

// Minimal valid env for tests
const validEnv = () => ({
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "https://s3.example.com",
  S3_BUCKET: "episto-files",
  S3_ACCESS_KEY: "AKIAEXAMPLE",
  S3_SECRET_KEY: "secret123",
  STRIPE_SECRET_KEY: "sk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
  ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
  AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
  AZURE_OPENAI_API_KEY: "key123",
  AZURE_SPEECH_REGION: "switzerlandnorth",
  AZURE_SPEECH_API_KEY: "speech-key-123",
  RESEND_API_KEY: "re_abc123",
});

// ---------------------------------------------------------------------------
// Stripe environment safety — live keys must never be used outside production
// ---------------------------------------------------------------------------

describe("Stripe environment safety", () => {
  it("allows test keys in development", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: "sk_test_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("allows test keys in test environment", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "test",
      STRIPE_SECRET_KEY: "sk_test_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects live secret key in development", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: "sk_live_abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects live secret key in test environment", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "test",
      STRIPE_SECRET_KEY: "sk_live_abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects restricted live key (rk_live_*) in development", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: "rk_live_abc123",
    });
    // rk_live_ doesn't start with sk_ so it fails the startsWith("sk_") check too
    expect(result.success).toBe(false);
  });

  it("allows live keys in production", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "production",
      STRIPE_SECRET_KEY: "sk_live_abc123",
      CORS_ORIGIN: "https://app.swissmail.ch",
      APP_PUBLIC_URL: "https://app.swissmail.ch",
    });
    expect(result.success).toBe(true);
  });

  it("allows test keys in production (for staging with NODE_ENV=production)", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "production",
      STRIPE_SECRET_KEY: "sk_test_abc123",
      CORS_ORIGIN: "https://staging.swissmail.ch",
      APP_PUBLIC_URL: "https://staging.swissmail.ch",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isLiveStripeKey utility
// ---------------------------------------------------------------------------

describe("isLiveStripeKey", () => {
  it("detects sk_live_ as live", () => {
    expect(isLiveStripeKey("sk_live_abc123")).toBe(true);
  });

  it("detects rk_live_ as live", () => {
    expect(isLiveStripeKey("rk_live_abc123")).toBe(true);
  });

  it("returns false for sk_test_", () => {
    expect(isLiveStripeKey("sk_test_abc123")).toBe(false);
  });

  it("returns false for placeholder values", () => {
    expect(isLiveStripeKey("sk_replace_me")).toBe(false);
  });
});
