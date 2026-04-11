import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NEXT_PUBLIC_SITE_URL: "https://swissmail.test",
  NEXT_PUBLIC_API_URL: "/api",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  NEXT_PUBLIC_APP_ENV: "test" as const,
};

function createScopeMock() {
  return {
    setTag: vi.fn(),
    setContext: vi.fn(),
  };
}

async function loadErrorTrackingModule(envOverrides?: {
  NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
}) {
  vi.resetModules();

  const scope = createScopeMock();
  const sentry = {
    withScope: vi.fn((callback: (scope: ReturnType<typeof createScopeMock>) => void) => callback(scope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };

  vi.doMock("@sentry/nextjs", () => sentry);
  vi.doMock("../src/lib/env", () => ({
    env: {
      ...BASE_ENV,
      ...envOverrides,
    },
  }));

  const mod = await import("../src/lib/error-tracking");
  return { mod, scope, sentry };
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock("@sentry/nextjs");
  vi.doUnmock("../src/lib/env");
});

describe("frontend error tracking", () => {
  it("acts as a typed no-op when NEXT_PUBLIC_SENTRY_DSN is unset", async () => {
    const { mod, sentry } = await loadErrorTrackingModule({ NEXT_PUBLIC_SENTRY_DSN: undefined });

    mod.captureException(new Error("Component crashed"), {
      component: "ComposerPanel",
      route: "/en-CH/draft/draft-1",
      errorFamily: "rendering_failure",
      extra: { status: 500 },
    });
    mod.captureMessage("Slow API response", "warning", {
      component: "ComposerPanel",
    });

    expect(sentry.withScope).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("captures exceptions with safe tags and metadata when Sentry is enabled", async () => {
    const { mod, scope, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });
    const error = new Error("Component crashed");

    mod.captureException(error, {
      component: "ComposerPanel",
      route: "/en-CH/draft/draft-1",
      errorFamily: "rendering_failure",
      extra: {
        status: 500,
        retryable: true,
      },
    });

    expect(sentry.withScope).toHaveBeenCalledOnce();
    expect(scope.setTag).toHaveBeenCalledWith("component", "ComposerPanel");
    expect(scope.setTag).toHaveBeenCalledWith("route", "/en-CH/draft/draft-1");
    expect(scope.setTag).toHaveBeenCalledWith("error_family", "rendering_failure");
    expect(scope.setContext).toHaveBeenCalledWith("safe_metadata", {
      status: 500,
      retryable: true,
    });
    expect(sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("captures warning messages through the Sentry message API", async () => {
    const { mod, scope, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });

    mod.captureMessage("Slow API response", "warning", {
      component: "apiFetch",
      extra: { status: 503 },
    });

    expect(sentry.withScope).toHaveBeenCalledOnce();
    expect(scope.setTag).toHaveBeenCalledWith("component", "apiFetch");
    expect(scope.setContext).toHaveBeenCalledWith("safe_metadata", { status: 503 });
    expect(sentry.captureMessage).toHaveBeenCalledWith("Slow API response", "warning");
  });

  it("never throws if the Sentry SDK itself fails", async () => {
    const { mod, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });

    sentry.withScope.mockImplementation(() => {
      throw new Error("Sentry exploded");
    });

    expect(() => mod.captureException(new Error("boom"))).not.toThrow();
    expect(() => mod.captureMessage("warn", "warning")).not.toThrow();
  });
});
