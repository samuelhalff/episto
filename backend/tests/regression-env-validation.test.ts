/**
 * Regression: Env validation must still accept valid development/test configs
 * after adding the Stripe live-key safety refine.
 *
 * User stories:
 * - "As a developer, my .env with sk_test_* keys loads without error."
 * - "As a developer, production configs with sk_live_* keys are accepted."
 * - "As a developer, the ePost live-mode gate still works independently."
 * - "As a developer, all existing env defaults still apply."
 */
import { describe, expect, it } from "vitest";
import { EnvSchema } from "../src/shared/config/env.js";

function makeValidEnv(overrides?: Record<string, unknown>) {
  return {
    NODE_ENV: "development",
    PORT: 3001,
    DATABASE_URL: "postgresql://localhost:5432/swissmail",
    REDIS_URL: "redis://localhost:6379",
    S3_ENDPOINT: "http://localhost:9000",
    S3_BUCKET: "swissmail",
    S3_ACCESS_KEY: "minio",
    S3_SECRET_KEY: "minio123",
    STRIPE_SECRET_KEY: "sk_test_abc123456",
    STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
    ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
    RESEND_API_KEY: "re_test_abc",
    AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
    AZURE_OPENAI_API_KEY: "key123",
    AZURE_SPEECH_REGION: "switzerlandnorth",
    AZURE_SPEECH_API_KEY: "speech-key-123",
    ...overrides,
  };
}

describe("regression: env validation accepts valid configs", () => {
  it("accepts a standard development config with test Stripe keys", () => {
    const result = EnvSchema.safeParse(makeValidEnv());
    expect(result.success).toBe(true);
  });

  it("accepts a production config with live Stripe keys", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "sk_live_prod_key_123",
        CORS_ORIGIN: "https://swissmail.ch",
        APP_PUBLIC_URL: "https://swissmail.ch",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects live Stripe keys in development", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({ STRIPE_SECRET_KEY: "sk_live_dangerous" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("Live Stripe keys"))).toBe(true);
    }
  });

  it("rejects live Stripe keys in test", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        NODE_ENV: "test",
        STRIPE_SECRET_KEY: "sk_live_nope",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects restricted live keys (rk_live_) in development", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({ STRIPE_SECRET_KEY: "rk_live_restricted" }),
    );
    expect(result.success).toBe(false);
  });

  it("still rejects ePost live mode outside production", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        POSTAL_DISPATCH_PROVIDER: "epost",
        EPOST_SUBMISSION_MODE: "live",
        EPOST_API_KEY: "key",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("EPOST_SUBMISSION_MODE=live"))).toBe(true);
    }
  });

  it("accepts ePost mock mode in development", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        POSTAL_DISPATCH_PROVIDER: "epost",
        EPOST_SUBMISSION_MODE: "mock",
        EPOST_API_KEY: "key",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("applies default values for optional fields", () => {
    const result = EnvSchema.safeParse(makeValidEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SESSION_TTL_HOURS).toBe(72);
      expect(result.data.ORDER_ACCESS_DAYS).toBe(90);
      expect(result.data.CONTENT_RETENTION_DAYS).toBe(7);
      expect(result.data.STATEMENT_RETENTION_DAYS).toBe(10);
      expect(result.data.EPOST_SUBMISSION_MODE).toBe("mock");
      expect(result.data.POSTAL_DISPATCH_PROVIDER).toBe("stub");
      expect(result.data.APP_DISPLAY_NAME).toBe("Episto");
      expect(result.data.SUPPORT_EMAIL).toBe("support@swissmail.ch");
    }
  });

  it("still validates CORS_ORIGIN HTTPS requirement in production", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "sk_live_prod",
        CORS_ORIGIN: "http://insecure.example.com",
        APP_PUBLIC_URL: "https://swissmail.ch",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("HTTPS"))).toBe(true);
    }
  });

  it("still validates AI provider config completeness", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        AI_PROVIDER_MODE: "azure_openai",
        AZURE_OPENAI_ENDPOINT: undefined,
        AZURE_OPENAI_API_KEY: undefined,
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects placeholder Azure Speech keys outside test mode", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        AZURE_SPEECH_API_KEY: "dev-speech-key",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("still allows placeholder Azure Speech keys in test mode", () => {
    const result = EnvSchema.safeParse(
      makeValidEnv({
        NODE_ENV: "test",
        AZURE_SPEECH_API_KEY: "dev-speech-key",
      }),
    );
    expect(result.success).toBe(true);
  });
});
