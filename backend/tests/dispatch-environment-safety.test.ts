import { describe, it, expect } from "vitest";
import { EnvSchema } from "../src/shared/config/index.js";

const validEnv = () => ({
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "https://s3.example.com",
  S3_BUCKET: "swiss-mail-files",
  S3_ACCESS_KEY: "AKIAEXAMPLE",
  S3_SECRET_KEY: "secret123",
  STRIPE_SECRET_KEY: "sk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
  AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
  AZURE_OPENAI_API_KEY: "key123",
  RESEND_API_KEY: "re_abc123",
});

// ---------------------------------------------------------------------------
// ePost dispatch environment safety
// ---------------------------------------------------------------------------

describe("ePost dispatch environment safety", () => {
  it("defaults EPOST_SUBMISSION_MODE to mock", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.EPOST_SUBMISSION_MODE).toBe("mock");
  });

  it("defaults POSTAL_DISPATCH_PROVIDER to stub", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.POSTAL_DISPATCH_PROVIDER).toBe("stub");
  });

  it("rejects live ePost submission in development", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "development",
      POSTAL_DISPATCH_PROVIDER: "epost",
      EPOST_API_KEY: "key",
      EPOST_SUBMISSION_MODE: "live",
    });
    expect(result.success).toBe(false);
  });

  it("rejects live ePost submission in test", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "test",
      POSTAL_DISPATCH_PROVIDER: "epost",
      EPOST_API_KEY: "key",
      EPOST_SUBMISSION_MODE: "live",
    });
    expect(result.success).toBe(false);
  });

  it("rejects live ePost with stub provider", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "production",
      POSTAL_DISPATCH_PROVIDER: "stub",
      EPOST_SUBMISSION_MODE: "live",
      CORS_ORIGIN: "https://app.swissmail.ch",
    });
    expect(result.success).toBe(false);
  });

  it("requires EPOST_API_KEY when provider is epost", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      POSTAL_DISPATCH_PROVIDER: "epost",
    });
    expect(result.success).toBe(false);
  });

  it("allows live ePost in production with epost provider", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "production",
      POSTAL_DISPATCH_PROVIDER: "epost",
      EPOST_API_KEY: "epost-live-key",
      EPOST_SUBMISSION_MODE: "live",
      CORS_ORIGIN: "https://app.swissmail.ch",
      STRIPE_SECRET_KEY: "sk_test_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("allows mock ePost in development with epost provider", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      POSTAL_DISPATCH_PROVIDER: "epost",
      EPOST_API_KEY: "epost-test-key",
      EPOST_SUBMISSION_MODE: "mock",
    });
    expect(result.success).toBe(true);
  });
});
