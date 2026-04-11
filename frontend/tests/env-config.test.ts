import { describe, expect, it } from "vitest";

describe("frontend env parsing", () => {
  it("accepts the required public env vars and preserves optional values", async () => {
    const { parseFrontendEnv } = await import("../src/lib/env");

    expect(
      parseFrontendEnv({
        NEXT_PUBLIC_SITE_URL: "https://swissmail.ch",
        NEXT_PUBLIC_API_URL: "/api",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
        NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
        NEXT_PUBLIC_APP_ENV: "production",
      }),
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: "https://swissmail.ch",
      NEXT_PUBLIC_API_URL: "/api",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
      NEXT_PUBLIC_APP_ENV: "production",
    });
  });

  it("rejects missing or placeholder public configuration", async () => {
    const { parseFrontendEnv } = await import("../src/lib/env");

    expect(() =>
      parseFrontendEnv({
        NEXT_PUBLIC_SITE_URL: "",
        NEXT_PUBLIC_API_URL: "/api",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_replace_me",
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  });
});
