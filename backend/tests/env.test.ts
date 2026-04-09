import { describe, it, expect } from "vitest";
import { EnvSchema } from "../src/shared/config/index.js";

// Minimal valid env for tests
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
// Valid minimal env
// ---------------------------------------------------------------------------

describe("EnvSchema — valid minimal env", () => {
  it("parses with all required fields present", () => {
    const result = EnvSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
  });

  it("applies default NODE_ENV", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.NODE_ENV).toBe("development");
  });

  it("applies default PORT", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.PORT).toBe(3001);
  });

  it("applies default HOST", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.HOST).toBe("0.0.0.0");
  });

  it("applies default LOG_LEVEL", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.LOG_LEVEL).toBe("info");
  });

  it("applies default SESSION_TTL_HOURS", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.SESSION_TTL_HOURS).toBe(72);
  });

  it("applies default CORS_ORIGIN", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.CORS_ORIGIN).toBe("http://localhost:5000");
  });

  it("applies default EMAIL_FROM", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.EMAIL_FROM).toBe("noreply@swissmail.ch");
  });

  it("applies default S3_REGION", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.S3_REGION).toBe("us-east-1");
  });

  it("applies default AI_PROVIDER_MODE", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.AI_PROVIDER_MODE).toBe("azure_openai");
  });

  it("applies default ADDRESS_SEARCH_PROVIDER", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.ADDRESS_SEARCH_PROVIDER).toBe("geo_admin");
  });

  it("applies default GEO_ADMIN_API_BASE_URL", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.GEO_ADMIN_API_BASE_URL).toBe("https://api3.geo.admin.ch");
  });

  it("defaults ePost submission mode to mock to avoid fee-bearing sends before production", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.EPOST_SUBMISSION_MODE).toBe("mock");
  });
});

// ---------------------------------------------------------------------------
// Missing required fields
// ---------------------------------------------------------------------------

describe("EnvSchema — missing required fields", () => {
  it("fails without DATABASE_URL", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).DATABASE_URL;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails without REDIS_URL", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).REDIS_URL;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails without S3_ENDPOINT", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).S3_ENDPOINT;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails without STRIPE_SECRET_KEY", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).STRIPE_SECRET_KEY;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails without AZURE_OPENAI_ENDPOINT", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).AZURE_OPENAI_ENDPOINT;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails without RESEND_API_KEY", () => {
    const e = { ...validEnv() };
    delete (e as Record<string, unknown>).RESEND_API_KEY;
    const result = EnvSchema.safeParse(e);
    expect(result.success).toBe(false);
  });

  it("fails in azure_ai_project_agent mode without project settings", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      AI_PROVIDER_MODE: "azure_ai_project_agent",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_KEY: undefined,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Coercion
// ---------------------------------------------------------------------------

describe("EnvSchema — coercion", () => {
  it("coerces SESSION_TTL_HOURS from string to number", () => {
    const result = EnvSchema.parse({ ...validEnv(), SESSION_TTL_HOURS: "48" });
    expect(result.SESSION_TTL_HOURS).toBe(48);
    expect(typeof result.SESSION_TTL_HOURS).toBe("number");
  });

  it("coerces PORT from string to number", () => {
    const result = EnvSchema.parse({ ...validEnv(), PORT: "8080" });
    expect(result.PORT).toBe(8080);
  });

  it("rejects SESSION_TTL_HOURS of 0 (must be positive)", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), SESSION_TTL_HOURS: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects negative SESSION_TTL_HOURS", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), SESSION_TTL_HOURS: "-1" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation constraints
// ---------------------------------------------------------------------------

describe("EnvSchema — validation constraints", () => {
  it("rejects invalid NODE_ENV", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid LOG_LEVEL", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), LOG_LEVEL: "verbose" });
    expect(result.success).toBe(false);
  });

  it("rejects STRIPE_SECRET_KEY without sk_ prefix", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      STRIPE_SECRET_KEY: "pk_test_abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects STRIPE_WEBHOOK_SECRET without whsec_ prefix", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      STRIPE_WEBHOOK_SECRET: "wh_test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects RESEND_API_KEY without re_ prefix", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), RESEND_API_KEY: "key_abc" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid DATABASE_URL (not a URL)", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), DATABASE_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects empty AZURE_OPENAI_API_KEY", () => {
    const result = EnvSchema.safeParse({ ...validEnv(), AZURE_OPENAI_API_KEY: "" });
    expect(result.success).toBe(false);
  });

  it("accepts azure_ai_project_agent mode with required project settings", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      AI_PROVIDER_MODE: "azure_ai_project_agent",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_KEY: undefined,
      AZURE_AI_PROJECT_ENDPOINT:
        "https://example.services.ai.azure.com/api/projects/example",
      AZURE_AI_AGENT_NAME: "web-deep-search",
      AZURE_AI_AGENT_VERSION: "5",
    });
    expect(result.success).toBe(true);
  });

  it("accepts azure_ai_project_agent mode with AZURE_EXISTING_AGENT_ID", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      AI_PROVIDER_MODE: "azure_ai_project_agent",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_KEY: undefined,
      AZURE_AI_PROJECT_ENDPOINT:
        "https://example.services.ai.azure.com/api/projects/example",
      AZURE_EXISTING_AGENT_ID: "swiss-mail:2",
      AZURE_AI_AGENT_NAME: undefined,
      AZURE_AI_AGENT_VERSION: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("accepts geo_admin address search without any extra secret", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      ADDRESS_SEARCH_PROVIDER: "geo_admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched Azure project endpoints when both are set", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      AZURE_AI_PROJECT_ENDPOINT:
        "https://example.services.ai.azure.com/api/projects/example-a",
      AZURE_EXISTING_AIPROJECT_ENDPOINT:
        "https://example.services.ai.azure.com/api/projects/example-b",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched agent metadata when both forms are set", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      AI_PROVIDER_MODE: "azure_ai_project_agent",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_KEY: undefined,
      AZURE_AI_PROJECT_ENDPOINT:
        "https://example.services.ai.azure.com/api/projects/example",
      AZURE_EXISTING_AGENT_ID: "swiss-mail:2",
      AZURE_AI_AGENT_NAME: "swiss-mail",
      AZURE_AI_AGENT_VERSION: "3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects live ePost submission outside production", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      POSTAL_DISPATCH_PROVIDER: "epost",
      EPOST_API_KEY: "epost-test-key",
      EPOST_SUBMISSION_MODE: "live",
      NODE_ENV: "development",
    });
    expect(result.success).toBe(false);
  });

  it("rejects live ePost submission when the provider is not ePost", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      NODE_ENV: "production",
      POSTAL_DISPATCH_PROVIDER: "stub",
      EPOST_SUBMISSION_MODE: "live",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Admin Microsoft SSO validation
// ---------------------------------------------------------------------------

const ssoBase = () => ({
  ...validEnv(),
  ADMIN_SESSION_SECRET: "admin-session-secret-at-least-32-characters-long",
  ADMIN_MICROSOFT_CLIENT_ID: "client-id",
  ADMIN_MICROSOFT_CLIENT_SECRET: "client-secret",
  ADMIN_MICROSOFT_REDIRECT_URI: "https://app.example.com/admin/auth/microsoft/callback",
  ADMIN_MICROSOFT_TENANT_ID: "westbaysa-tenant",
});

describe("EnvSchema — Admin Microsoft SSO validation", () => {
  it("accepts full SSO config without ADMIN_MICROSOFT_ALLOWED_EMAILS", () => {
    const result = EnvSchema.safeParse(ssoBase());
    expect(result.success).toBe(true);
  });

  it("rejects SSO config when ADMIN_MICROSOFT_TENANT_ID is 'common'", () => {
    const result = EnvSchema.safeParse({
      ...ssoBase(),
      ADMIN_MICROSOFT_TENANT_ID: "common",
    });
    expect(result.success).toBe(false);
  });

  it("rejects partial SSO config (client_id set but missing other required fields)", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      ADMIN_MICROSOFT_CLIENT_ID: "client-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects SSO config without ADMIN_SESSION_SECRET", () => {
    const result = EnvSchema.safeParse({
      ...ssoBase(),
      ADMIN_SESSION_SECRET: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("accepts env with no SSO fields set (SSO not requested)", () => {
    const result = EnvSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dispatch pricing refresh config
// ---------------------------------------------------------------------------

describe("EnvSchema — dispatch pricing refresh config", () => {
  it("parses dispatch pricing refresh settings with defaults", () => {
    const result = EnvSchema.parse(validEnv());
    expect(result.DISPATCH_RATE_MATRIX_TTL_HOURS).toBe(24);
    expect(result.LIVE_DISPATCH_QUOTE_TTL_MINUTES).toBe(30);
  });

  it("coerces dispatch pricing refresh settings from strings", () => {
    const result = EnvSchema.parse({
      ...validEnv(),
      DISPATCH_RATE_MATRIX_TTL_HOURS: "48",
      LIVE_DISPATCH_QUOTE_TTL_MINUTES: "15",
    });
    expect(result.DISPATCH_RATE_MATRIX_TTL_HOURS).toBe(48);
    expect(result.LIVE_DISPATCH_QUOTE_TTL_MINUTES).toBe(15);
  });

  it("rejects zero or negative TTL values", () => {
    expect(
      EnvSchema.safeParse({
        ...validEnv(),
        DISPATCH_RATE_MATRIX_TTL_HOURS: "0",
      }).success,
    ).toBe(false);

    expect(
      EnvSchema.safeParse({
        ...validEnv(),
        LIVE_DISPATCH_QUOTE_TTL_MINUTES: "-1",
      }).success,
    ).toBe(false);
  });
});
