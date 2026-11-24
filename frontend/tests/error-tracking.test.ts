import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NEXT_PUBLIC_SITE_URL: "https://episto.test",
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
    init: vi.fn(),
    withScope: vi.fn((callback: (scope: ReturnType<typeof createScopeMock>) => void) =>
      callback(scope),
    ),
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
    const { mod, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: undefined,
    });

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

    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalled());
    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.withScope).toHaveBeenCalledOnce();
    expect(scope.setTag).toHaveBeenCalledWith("component", "ComposerPanel");
    expect(scope.setTag).toHaveBeenCalledWith("route", "/en-CH/draft/[token]");
    expect(scope.setTag).toHaveBeenCalledWith("error_family", "rendering_failure");
    expect(scope.setContext).toHaveBeenCalledWith("safe_metadata", {
      status: 500,
      retryable: true,
    });
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Error",
        message: "Component crashed",
      }),
    );
    expect(sentry.captureException.mock.calls[0]?.[0]).not.toBe(error);
  });

  it("captures warning messages through the Sentry message API", async () => {
    const { mod, scope, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });

    mod.captureMessage("Slow API response", "warning", {
      component: "apiFetch",
      extra: { status: 503 },
    });

    await vi.waitFor(() => expect(sentry.captureMessage).toHaveBeenCalled());
    expect(sentry.withScope).toHaveBeenCalledOnce();
    expect(scope.setTag).toHaveBeenCalledWith("component", "apiFetch");
    expect(scope.setContext).toHaveBeenCalledWith("safe_metadata", { status: 503 });
    expect(sentry.captureMessage).toHaveBeenCalledWith("Slow API response", "warning");
  });

  it("sanitizes route-like metadata before sending it to Sentry", async () => {
    const { mod, scope } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });

    mod.captureMessage("navigating", "warning", {
      route: "/en-CH/draft/draft-99/review",
      extra: {
        path: "/api/v1/drafts/draft-99/stream",
      },
    });

    await vi.waitFor(() => expect(scope.setContext).toHaveBeenCalled());
    expect(scope.setTag).toHaveBeenCalledWith("route", "/en-CH/draft/[token]/review");
    expect(scope.setContext).toHaveBeenCalledWith("safe_metadata", {
      path: "/api/v1/drafts/[token]/stream",
    });
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

  it("strips custom error fields before passing exceptions to Sentry", async () => {
    const { mod, sentry } = await loadErrorTrackingModule({
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });
    const apiLikeError = Object.assign(new Error("API error 500"), {
      body: { error: { userMessage: "sensitive" } },
      request: { path: "/v1/drafts/draft-1" },
    });

    mod.captureException(apiLikeError);

    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalled());
    const capturedError = sentry.captureException.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(capturedError.message).toBe("API error 500");
    expect(capturedError).not.toHaveProperty("body");
    expect(capturedError).not.toHaveProperty("request");
  });
});
