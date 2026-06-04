import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";

import { PostalPostageSchema } from "@episto/shared";

const PLACEHOLDER_AZURE_SPEECH_KEYS = new Set(["dev-speech-key", "replace_me"]);

/**
 * Environment configuration schema.
 * All values are loaded from process.env and validated at startup.
 * The app refuses to start if required values are missing.
 */
export const EnvSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().default(3001),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url(),

    // Object Storage (S3-compatible)
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: z.string(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

    // Provider-backed signing
    SIGNATURE_PROVIDER_MODE: z
      .enum(["disabled", "swisssign_mock", "swisssign"])
      .default("swisssign_mock"),
    SIGNATURE_CALLBACK_SECRET: z
      .string()
      .min(16)
      .default("dev-signature-callback-secret"),
    SIGNATURE_PENDING_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    SWISSID_OIDC_ISSUER: z.string().url().optional(),
    SWISSID_OIDC_CLIENT_ID: z.string().min(1).optional(),
    SWISSID_OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    SWISSID_OIDC_REDIRECT_URI: z.string().url().optional(),
    SWISSID_OIDC_SCOPES: z.string().min(1).default("openid profile email"),
    SWISSID_OIDC_STEPUP_PURPOSE: z.string().min(1).default("SIGNING"),
    SWISSID_OIDC_ENABLE_PKCE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SWISSSIGN_API_BASE_URL: z.string().url().optional(),
    SWISSSIGN_API_KEY: z.string().min(1).optional(),

    // Session
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
    RESUME_INACTIVITY_HOURS: z.coerce.number().int().positive().default(48),
    ORDER_ACCESS_DAYS: z.coerce.number().int().positive().default(90),
    ORDER_ACCESS_TOKEN_SECRET: z.string().min(32),

    // Retention
    CONTENT_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    PDF_RETENTION_HOURS_POST_DISPATCH: z.coerce.number().int().positive().default(24),
    METADATA_RETENTION_YEARS: z.coerce.number().int().positive().default(7),
    STATEMENT_RETENTION_DAYS: z.coerce.number().int().positive().default(10),

    // AI
    AI_PROVIDER_MODE: z
      .enum(["azure_openai", "azure_ai_project_agent"])
      .default("azure_openai"),
    AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
    AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
    AZURE_OPENAI_API_VERSION: z.string().default("2024-06-01"),
    AI_DRAFT_MODEL: z.string().default("gpt-4.1"),
    AI_CLASSIFY_MODEL: z.string().default("gpt-4.1-mini"),
    AZURE_SPEECH_REGION: z.string().min(1),
    AZURE_SPEECH_API_KEY: z.string().min(1),
    AZURE_SPEECH_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    AZURE_SPEECH_CUSTOM_ENDPOINT_ID: z.string().min(1).optional(),
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

    // Postal dispatch
    POSTAL_DISPATCH_PROVIDER: z.enum(["stub", "epost"]).default("stub"),
    EPOST_SUBMISSION_MODE: z.enum(["mock", "live"]).default("mock"),
    EPOST_API_BASE_URL: z.string().url().default("https://api.epost.ch"),
    EPOST_API_KEY: z.string().min(1).optional(),
    EPOST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
    EPOST_STANDARD_POSTAGE: PostalPostageSchema.default("A_POST"),
    EPOST_REGISTERED_POSTAGE: PostalPostageSchema.default("REGISTERED"),

    // Address search
    COMPANY_SEARCH_PROVIDER: z.enum(["zefix"]).default("zefix"),
    COMPANY_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    ZEFIX_PROXY_BASE_URL: z.string().url().default("http://zefix-proxy:8081"),
    ZEFIX_USERNAME: z.string().min(1).optional(),
    ZEFIX_PASSWORD: z.string().min(1).optional(),
    ZEFIX_BASE_URL: z.string().url().default("https://www.zefix.admin.ch"),
    ZEFIX_COMPANY_SEARCH_PATH: z
      .string()
      .min(1)
      .default("/ZefixPublicREST/api/v1/company/search"),
    ZEFIX_COMPANY_SEARCH_METHOD: z.enum(["GET", "POST"]).default("POST"),
    ZEFIX_PROXY_PORT: z.coerce.number().int().positive().default(8081),
    ADDRESS_SEARCH_PROVIDER: z.enum(["none", "geo_admin"]).default("geo_admin"),
    ADDRESS_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    GEO_ADMIN_API_BASE_URL: z.string().url().default("https://api3.geo.admin.ch"),
    ADDRESS_VALIDATION_PROVIDER: z.enum(["none", "swiss_post"]).default("none"),
    SWISS_POST_ADDRESS_API_BASE_URL: z.string().url().optional(),
    SWISS_POST_ADDRESS_API_SCOPE: z.string().min(1).optional(),

    // Email
    RESEND_API_KEY: z.string().startsWith("re_"),
    APP_DISPLAY_NAME: z.string().min(1).default("Episto"),
    EMAIL_FROM: z.string().email().default("noreply@swissmail.ch"),
    SUPPORT_EMAIL: z.string().email().default("support@swissmail.ch"),
    LEGAL_ENTITY_NAME: z.string().min(1).default("West Bay SA"),
    LEGAL_ENTITY_ADDRESS_LINE_1: z.string().min(1).default("Chemin du Pre-Roset 19"),
    LEGAL_ENTITY_ADDRESS_LINE_2: z.string().min(1).default("1294 Genthod"),
    LEGAL_ENTITY_COUNTRY: z.string().min(1).default("Switzerland"),
    LEGAL_ENTITY_UID_VAT: z.string().min(1).default("CHE-107.892.984"),

    // SMS verification
    SMS_PROVIDER: z.enum(["noop", "budgetsms"]).default("noop"),
    SMS_SENDER_ID: z
      .string()
      .regex(/^[A-Za-z0-9]{1,11}$/)
      .default("EPISTO"),
    SMS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    BUDGETSMS_API_BASE_URL: z
      .string()
      .url()
      .default("https://api.budgetsms.net/sendsms/"),
    BUDGETSMS_USERNAME: z.string().min(1).optional(),
    BUDGETSMS_USER_ID: z.string().regex(/^\d+$/).optional(),
    BUDGETSMS_HANDLE: z.string().min(1).optional(),

    // Public URL (customer-facing frontend origin used in emails/links)
    APP_PUBLIC_URL: z.string().url().optional(),

    // CORS
    CORS_ORIGIN: z.string().default("http://localhost:5000"),

    // Admin
    ADMIN_SESSION_SECRET: z.string().min(32).optional(),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    ADMIN_MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    ADMIN_MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
    ADMIN_MICROSOFT_TENANT_ID: z.string().min(1).default("common"),
    ADMIN_MICROSOFT_REDIRECT_URI: z.string().url().optional(),

    // Pricing (integer cents, CHF only)
    PRICE_STANDARD_MARKUP_CENTS: z.coerce.number().int().nonnegative().default(340),
    PRICE_REGISTERED_MARKUP_CENTS: z.coerce.number().int().nonnegative().default(340),

    // Dispatch rate matrix refresh
    DISPATCH_RATE_MATRIX_TTL_HOURS: z.coerce.number().int().positive().default(24),
    DISPATCH_RATE_MATRIX_REFRESH_CRON: z.string().min(1).default("5 6 * * *"),
    LIVE_DISPATCH_QUOTE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === "test") {
        return true;
      }

      return !PLACEHOLDER_AZURE_SPEECH_KEYS.has(data.AZURE_SPEECH_API_KEY.trim());
    },
    {
      message:
        "AZURE_SPEECH_API_KEY must be a real Azure Speech key; placeholder values are not allowed",
    },
  )
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
      if (data.SMS_PROVIDER === "budgetsms") {
        return Boolean(
          data.BUDGETSMS_USERNAME && data.BUDGETSMS_USER_ID && data.BUDGETSMS_HANDLE,
        );
      }

      return true;
    },
    {
      message:
        "BUDGETSMS_USERNAME, BUDGETSMS_USER_ID, and BUDGETSMS_HANDLE are required when SMS_PROVIDER=budgetsms",
    },
  )
  .refine(
    (data) => {
      if (data.EPOST_SUBMISSION_MODE === "live") {
        return data.POSTAL_DISPATCH_PROVIDER === "epost";
      }

      return true;
    },
    {
      message: "EPOST_SUBMISSION_MODE=live requires POSTAL_DISPATCH_PROVIDER=epost",
    },
  )
  .refine(
    (data) => {
      if (data.EPOST_SUBMISSION_MODE === "live") {
        return data.NODE_ENV === "production";
      }

      return true;
    },
    {
      message: "EPOST_SUBMISSION_MODE=live is only allowed when NODE_ENV=production",
    },
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
      // Prevent live Stripe keys outside production — accidental live charges are a critical incident
      if (data.NODE_ENV !== "production") {
        return !(
          data.STRIPE_SECRET_KEY.startsWith("sk_live_") ||
          data.STRIPE_SECRET_KEY.startsWith("rk_live_")
        );
      }
      return true;
    },
    {
      message:
        "Live Stripe keys (sk_live_*, rk_live_*) are forbidden outside NODE_ENV=production",
    },
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return data.CORS_ORIGIN.split(",").every((o) => o.trim().startsWith("https://"));
      }
      return true;
    },
    { message: "CORS_ORIGIN must use HTTPS in production" },
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return Boolean(data.APP_PUBLIC_URL);
      }
      return true;
    },
    { message: "APP_PUBLIC_URL is required in production" },
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
  )
  .refine(
    (data) => {
      if (data.SIGNATURE_PROVIDER_MODE !== "swisssign") {
        return true;
      }

      return Boolean(
        data.SWISSID_OIDC_ISSUER &&
        data.SWISSID_OIDC_CLIENT_ID &&
        data.SWISSID_OIDC_REDIRECT_URI &&
        data.SWISSSIGN_API_BASE_URL,
      );
    },
    {
      message:
        "Live provider-backed signing mode requires SWISSID_OIDC_ISSUER, SWISSID_OIDC_CLIENT_ID, SWISSID_OIDC_REDIRECT_URI, and SWISSSIGN_API_BASE_URL",
    },
  );

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | undefined;

function loadLocalEnvFiles() {
  const cwd = process.cwd();
  const originalKeys = new Set(Object.keys(process.env));
  const candidates = [
    path.resolve(cwd, "../.env"),
    path.resolve(cwd, "../.env.local"),
    path.resolve(cwd, ".env"),
    path.resolve(cwd, ".env.local"),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    const parsed = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(parsed)) {
      if (originalKeys.has(key)) continue;
      process.env[key] = value;
    }
  }
}

export function loadEnv(): Env {
  if (_env) return _env;

  loadLocalEnvFiles();

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`❌ Invalid environment configuration:\n${formatted}`);
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function env(): Env {
  if (!_env) {
    throw new Error("env() called before loadEnv(). Call loadEnv() at startup.");
  }
  return _env;
}

export function isEnvLoaded(): boolean {
  return _env !== undefined;
}
