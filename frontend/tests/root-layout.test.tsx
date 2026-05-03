import * as React from "react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NEXT_PUBLIC_SITE_URL: "https://swissmail.test",
  NEXT_PUBLIC_API_URL: "/api",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  NEXT_PUBLIC_APP_ENV: "test" as const,
  NEXT_PUBLIC_SENTRY_DSN: undefined,
};

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock("next/font/google");
  vi.doUnmock("next/headers");
  vi.doUnmock("next-intl/server");
  vi.doUnmock("../src/components/ui/AppProviders");
  vi.doUnmock("../src/lib/env");
});

describe("RootLayout", () => {
  it("marks the nonce-bearing theme bootstrap script as hydration-ignored", async () => {
    vi.stubGlobal("React", React);
    vi.doMock("next/font/google", () => ({
      Inter: () => ({ variable: "font-test" }),
    }));
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ "x-nonce": "test-nonce" }),
    }));
    vi.doMock("next-intl/server", () => ({
      getLocale: async () => "en-CH",
    }));
    vi.doMock("../src/components/ui/AppProviders", () => ({
      AppProviders: ({ children }: { children: React.ReactNode }) => children,
    }));
    vi.doMock("../src/lib/env", () => ({
      env: BASE_ENV,
    }));

    const { default: RootLayout } = await import("../src/app/layout");
    const element = await RootLayout({ children: createElement("div") });

    const head = element.props.children[0];
    const script = head.props.children;

    expect(script.props.nonce).toBe("test-nonce");
    expect(script.props.suppressHydrationWarning).toBe(true);
  });
});
