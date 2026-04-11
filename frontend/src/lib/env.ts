import { z } from "zod";

const OPTIONAL_URL_SCHEMA = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

function isAbsoluteUrl(value: string): boolean {
  return z.string().url().safeParse(value).success;
}

export const FrontendEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().transform((value) => value.replace(/\/+$/, "")),
  NEXT_PUBLIC_API_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("/") || isAbsoluteUrl(value), {
      message: "NEXT_PUBLIC_API_URL must be an absolute URL or a root-relative path",
    }),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, {
      message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe publishable key",
    })
    .refine((value) => !/replace_me|placeholder/i.test(value), {
      message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must not use a placeholder value",
    }),
  NEXT_PUBLIC_SENTRY_DSN: OPTIONAL_URL_SCHEMA,
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
});

export type FrontendEnv = z.infer<typeof FrontendEnvSchema>;

export function parseFrontendEnv(source: Record<string, string | undefined>): FrontendEnv {
  return FrontendEnvSchema.parse(source);
}

export const env = parseFrontendEnv(process.env);
