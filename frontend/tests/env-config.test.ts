import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envSource = readFileSync(path.join(repoRoot, "frontend/src/lib/env.ts"), "utf8");

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

  it("reads public env from explicit keys so client bundles get Next inlined values", () => {
    expect(envSource).not.toContain("parseFrontendEnv(process.env)");
    expect(envSource).toContain("NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL");
    expect(envSource).toContain("NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL");
    expect(envSource).toContain(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    );
  });
});
