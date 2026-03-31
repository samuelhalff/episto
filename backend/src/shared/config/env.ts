import { z } from "zod";

/**
 * Environment configuration schema.
 * All values are loaded from process.env and validated at startup.
 * The app refuses to start if required values are missing.
 */
const EnvSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

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

  // Session
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
  RESUME_INACTIVITY_HOURS: z.coerce.number().int().positive().default(48),
  ORDER_ACCESS_DAYS: z.coerce.number().int().positive().default(90),

  // Retention
  CONTENT_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  PDF_RETENTION_HOURS_POST_DISPATCH: z.coerce
    .number()
    .int()
    .positive()
    .default(24),
  METADATA_RETENTION_YEARS: z.coerce.number().int().positive().default(7),

  // AI
  AI_PROVIDER_MODE: z.enum(["azure_openai", "azure_ai_project_agent"]).default("azure_openai"),
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

  // Address search
  COMPANY_SEARCH_PROVIDER: z.enum(["zefix"]).default("zefix"),
  COMPANY_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  ZEFIX_PROXY_BASE_URL: z.string().url().default("http://zefix-proxy:8081"),
  ADDRESS_VALIDATION_PROVIDER: z.enum(["none", "swiss_post"]).default("none"),
  SWISS_POST_ADDRESS_API_BASE_URL: z.string().url().optional(),
  SWISS_POST_ADDRESS_API_SCOPE: z.string().min(1).optional(),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().email().default("noreply@swissmail.ch"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Admin (HTTP Basic Auth)
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("changeme-in-production"),

  // Pricing (integer cents, CHF only)
  PRICE_STANDARD_CENTS: z.coerce.number().int().positive().default(490),
  PRICE_REGISTERED_CENTS: z.coerce.number().int().positive().default(890),
}).refine(
  (data) => {
    if (data.NODE_ENV === "production") {
      return data.ADMIN_PASSWORD !== "changeme-in-production";
    }
    return true;
  },
  { message: "ADMIN_PASSWORD must be changed from default in production" },
).refine(
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
).refine(
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
).refine(
  (data) => {
    if (
      data.AZURE_EXISTING_AGENT_ID &&
      data.AZURE_AI_AGENT_NAME &&
      data.AZURE_AI_AGENT_VERSION
    ) {
      return data.AZURE_EXISTING_AGENT_ID === `${data.AZURE_AI_AGENT_NAME}:${data.AZURE_AI_AGENT_VERSION}`;
    }

    return true;
  },
  {
    message:
      "AZURE_EXISTING_AGENT_ID must match AZURE_AI_AGENT_NAME:AZURE_AI_AGENT_VERSION when both are set",
  },
).refine(
  (data) => {
    if (data.NODE_ENV === "production") {
      return data.CORS_ORIGIN.split(",").every((o) => o.trim().startsWith("https://"));
    }
    return true;
  },
  { message: "CORS_ORIGIN must use HTTPS in production" },
);

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | undefined;

export function loadEnv(): Env {
  if (_env) return _env;

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
