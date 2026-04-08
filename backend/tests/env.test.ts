import { describe, it, expect } from "vitest";
import { z } from "zod";

// We cannot import EnvSchema directly because it's not exported.
// Instead we reconstruct the schema from the source to test its parse behaviour
// without calling loadEnv() / env() (which mutate global state).
// This mirrors the schema defined in backend/src/shared/config/env.ts exactly.

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().default(3001),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: z.string(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
    RESUME_INACTIVITY_HOURS: z.coerce.number().int().positive().default(48),
    ORDER_ACCESS_DAYS: z.coerce.number().int().positive().default(90),
    CONTENT_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    PDF_RETENTION_HOURS_POST_DISPATCH: z.coerce.number().int().positive().default(24),
    METADATA_RETENTION_YEARS: z.coerce.number().int().positive().default(7),
    AI_PROVIDER_MODE: z
      .enum(["azure_openai", "azure_ai_project_agent"])
      .default("azure_openai"),
    AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
    AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
    AZURE_OPENAI_API_VERSION: z.string().default("2024-06-01"),
    AI_DRAFT_MODEL: z.string().default("gpt-4.1"),
    AI_CLASSIFY_MODEL: z.string().default("gpt-4.1-mini"),
    AZURE_AI_PROJECT_ENDPOINT: z.string().url().optional(),
    AZURE_EXISTING_AIPROJECT_ENDPOINT: z.string().url().optional(),
    AZURE_ENV_NAME: z.string().min(1).optional(),
    AZURE_LOCATION: z.string().min(1).optional(),
    AZURE_SUBSCRIPTION_ID: z.string().min(1).optional(),
    AZURE_EXISTING_AIPROJECT_RESOURCE_ID: z.string().min(1).optional(),
    AZURE_EXISTING_RESOURCE_ID: z.string().min(1).optional(),
    AZURE_EXISTING_AGENT_ID: z.string().min(1).optional(),
    AZURE_AI_AGENT_NAME: z.string().min(1).optional(),
    AZURE_AI_AGENT_VERSION: z.string().min(1).optional(),
    AZURE_TENANT_ID: z.string().min(1).optional(),
    AZURE_CLIENT_ID: z.string().min(1).optional(),
    AZURE_CLIENT_SECRET: z.string().min(1).optional(),
    POSTAL_DISPATCH_PROVIDER: z.enum(["stub", "epost"]).default("stub"),
    EPOST_API_BASE_URL: z.string().url().default("https://api.epost.ch"),
    EPOST_API_KEY: z.string().min(1).optional(),
    EPOST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
    EPOST_STANDARD_POSTAGE: z
      .enum(["A_POST", "B_POST", "B_POST_LARGEVOLUME", "A_PLUS", "REGISTERED"])
      .default("A_POST"),
    EPOST_REGISTERED_POSTAGE: z
      .enum(["A_POST", "B_POST", "B_POST_LARGEVOLUME", "A_PLUS", "REGISTERED"])
      .default("REGISTERED"),
    COMPANY_SEARCH_PROVIDER: z.enum(["zefix"]).default("zefix"),
    COMPANY_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    ZEFIX_PROXY_BASE_URL: z.string().url().default("http://localhost:8081"),
    ZEFIX_USERNAME: z.string().min(1).optional(),
    ZEFIX_PASSWORD: z.string().min(1).optional(),
    ZEFIX_BASE_URL: z.string().url().default("https://www.zefix.admin.ch"),
    ZEFIX_COMPANY_SEARCH_PATH: z
      .string()
      .min(1)
      .default("/ZefixPublicREST/api/v1/company/search"),
    ZEFIX_COMPANY_SEARCH_METHOD: z.enum(["GET", "POST"]).default("POST"),
    ZEFIX_PROXY_PORT: z.coerce.number().int().positive().default(8081),
    ADDRESS_SEARCH_PROVIDER: z.enum(["none", "google_places"]).default("none"),
    ADDRESS_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    GOOGLE_PLACES_API_BASE_URL: z.string().url().default("https://places.googleapis.com"),
    GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
    ADDRESS_VALIDATION_PROVIDER: z.enum(["none", "swiss_post"]).default("none"),
    SWISS_POST_ADDRESS_API_BASE_URL: z.string().url().optional(),
    SWISS_POST_ADDRESS_API_SCOPE: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().startsWith("re_"),
    EMAIL_FROM: z.string().email().default("noreply@swissmail.ch"),
    CORS_ORIGIN: z.string().default("http://localhost:5000"),
    ADMIN_SESSION_SECRET: z.string().min(32).optional(),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    ADMIN_MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    ADMIN_MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
    ADMIN_MICROSOFT_TENANT_ID: z.string().min(1).default("common"),
    ADMIN_MICROSOFT_REDIRECT_URI: z.string().url().optional(),
    PRICE_STANDARD_MARKUP_CENTS: z.coerce.number().int().nonnegative().default(340),
    PRICE_REGISTERED_MARKUP_CENTS: z.coerce.number().int().nonnegative().default(340),
    DISPATCH_RATE_MATRIX_TTL_HOURS: z.coerce.number().int().positive().default(24),
    LIVE_DISPATCH_QUOTE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  })
  .refine(
    (data) => {
      if (data.AI_PROVIDER_MODE === "azure_openai") {
        return Boolean(data.AZURE_OPENAI_ENDPOINT && data.AZURE_OPENAI_API_KEY);
      }

      return Boolean(
        data.AZURE_AI_PROJECT_ENDPOINT &&
        (data.AZURE_EXISTING_AGENT_ID ||
          (data.AZURE_AI_AGENT_NAME && data.AZURE_AI_AGENT_VERSION)),
      );
    },
    {
      message:
        "AI provider configuration is incomplete for the selected AI_PROVIDER_MODE",
    },
  )
  .refine(
    (data) => {
      if (data.POSTAL_DISPATCH_PROVIDER === "epost") {
        return Boolean(data.EPOST_API_KEY);
      }

      return true;
    },
    { message: "EPOST_API_KEY is required when POSTAL_DISPATCH_PROVIDER=epost" },
  )
  .refine(
    (data) => {
      if (
        data.AZURE_AI_PROJECT_ENDPOINT &&
        data.AZURE_EXISTING_AIPROJECT_ENDPOINT &&
        data.AZURE_AI_PROJECT_ENDPOINT !== data.AZURE_EXISTING_AIPROJECT_ENDPOINT
      ) {
        return false;
      }

      return true;
    },
    {
      message:
        "AZURE_AI_PROJECT_ENDPOINT and AZURE_EXISTING_AIPROJECT_ENDPOINT must match when both are set",
    },
  )
  .refine(
    (data) => {
      if (
        data.AZURE_EXISTING_AGENT_ID &&
        data.AZURE_AI_AGENT_NAME &&
        data.AZURE_AI_AGENT_VERSION
      ) {
        return (
          data.AZURE_EXISTING_AGENT_ID ===
          `${data.AZURE_AI_AGENT_NAME}:${data.AZURE_AI_AGENT_VERSION}`
        );
      }

      return true;
    },
    {
      message:
        "AZURE_EXISTING_AGENT_ID must match AZURE_AI_AGENT_NAME:AZURE_AI_AGENT_VERSION when both are set",
    },
  )
  .refine(
    (data) => {
      if (data.ADDRESS_SEARCH_PROVIDER === "google_places") {
        return Boolean(data.GOOGLE_PLACES_API_KEY);
      }

      return true;
    },
    {
      message:
        "GOOGLE_PLACES_API_KEY is required when ADDRESS_SEARCH_PROVIDER=google_places",
    },
  )
  .refine(
    (data) => {
      const adminSsoRequested = Boolean(
        data.ADMIN_MICROSOFT_CLIENT_ID ||
          data.ADMIN_MICROSOFT_CLIENT_SECRET ||
          data.ADMIN_MICROSOFT_REDIRECT_URI,
      );

      if (!adminSsoRequested) {
        return true;
      }

      return Boolean(
        data.ADMIN_SESSION_SECRET &&
          data.ADMIN_MICROSOFT_CLIENT_ID &&
          data.ADMIN_MICROSOFT_CLIENT_SECRET &&
          data.ADMIN_MICROSOFT_REDIRECT_URI &&
          data.ADMIN_MICROSOFT_TENANT_ID &&
          data.ADMIN_MICROSOFT_TENANT_ID !== "common",
      );
    },
    {
      message:
        "Admin Microsoft SSO requires ADMIN_SESSION_SECRET, ADMIN_MICROSOFT_CLIENT_ID, ADMIN_MICROSOFT_CLIENT_SECRET, ADMIN_MICROSOFT_REDIRECT_URI, and a specific ADMIN_MICROSOFT_TENANT_ID (not 'common')",
    },
  );

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
    expect(result.ADDRESS_SEARCH_PROVIDER).toBe("none");
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

  it("rejects google_places address search without GOOGLE_PLACES_API_KEY", () => {
    const result = EnvSchema.safeParse({
      ...validEnv(),
      ADDRESS_SEARCH_PROVIDER: "google_places",
      GOOGLE_PLACES_API_KEY: undefined,
    });
    expect(result.success).toBe(false);
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
// Dispatch pricing refresh config — runtime loader test
// ---------------------------------------------------------------------------

it("parses dispatch pricing refresh settings", async () => {
  const { loadEnv, env } = await import("../src/shared/config/index.js");

  process.env.DISPATCH_RATE_MATRIX_TTL_HOURS = "24";
  process.env.LIVE_DISPATCH_QUOTE_TTL_MINUTES = "30";

  loadEnv();

  expect(env().DISPATCH_RATE_MATRIX_TTL_HOURS).toBe(24);
  expect(env().LIVE_DISPATCH_QUOTE_TTL_MINUTES).toBe(30);
});
