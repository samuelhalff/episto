import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NEXT_PUBLIC_SITE_URL: "https://swissmail.test",
  NEXT_PUBLIC_API_URL: "/api",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  NEXT_PUBLIC_APP_ENV: "test" as const,
};

async function loadClientBootstrap(nextPublicSentryDsn?: string) {
  vi.resetModules();

  const sentry = {
    init: vi.fn(),
    captureRouterTransitionStart: vi.fn(),
  };

  vi.doMock("@sentry/nextjs", () => sentry);
  vi.doMock("../src/lib/env", () => ({
    env: {
      ...BASE_ENV,
      NEXT_PUBLIC_SENTRY_DSN: nextPublicSentryDsn,
    },
  }));

  const mod = await import("../src/instrumentation-client");
  return { mod, sentry };
}

async function loadServerBootstrap(options?: {
  nextPublicSentryDsn?: string;
  serverSentryDsn?: string | undefined;
}) {
  vi.resetModules();

  const sentry = {
    init: vi.fn(),
  };

  vi.doMock("@sentry/nextjs", () => sentry);
  vi.doMock("../src/lib/env", () => ({
    env: {
      ...BASE_ENV,
      NEXT_PUBLIC_SENTRY_DSN: options?.nextPublicSentryDsn,
    },
  }));

  const originalServerDsn = process.env.SENTRY_DSN;
  process.env.SENTRY_DSN = options?.serverSentryDsn;
  const mod = await import("../src/sentry.server.config");
  process.env.SENTRY_DSN = originalServerDsn;

  return { mod, sentry };
}

async function loadInstrumentation(nextRuntime: "nodejs" | "edge") {
  vi.resetModules();

  const sentry = {
    captureRequestError: vi.fn(),
  };
  const loadServerConfig = vi.fn();
  const loadEdgeConfig = vi.fn();

  vi.doMock("@sentry/nextjs", () => sentry);
  vi.doMock("../src/sentry.server.config", () => {
    loadServerConfig();
    return {};
  });
  vi.doMock("../src/sentry.edge.config", () => {
    loadEdgeConfig();
    return {};
  });

  process.env.NEXT_RUNTIME = nextRuntime;
  const mod = await import("../src/instrumentation");

  return { mod, sentry, loadServerConfig, loadEdgeConfig };
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock("@sentry/nextjs");
  vi.doUnmock("../src/lib/env");
  vi.doUnmock("../src/sentry.server.config");
  vi.doUnmock("../src/sentry.edge.config");
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_RUNTIME;
});

describe("frontend sentry bootstrap", () => {
  it("skips client-side init when NEXT_PUBLIC_SENTRY_DSN is unset", async () => {
    const { sentry } = await loadClientBootstrap(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("initializes the browser SDK when NEXT_PUBLIC_SENTRY_DSN is present", async () => {
    const dsn = "https://public@example.ingest.sentry.io/123";
    const { mod, sentry } = await loadClientBootstrap(dsn);

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn,
        environment: "test",
        sendDefaultPii: false,
      }),
    );
    expect(mod.onRouterTransitionStart).toBe(sentry.captureRouterTransitionStart);
  });

  it("initializes the server SDK from the server DSN when present", async () => {
    const { sentry } = await loadServerBootstrap({
      nextPublicSentryDsn: "https://public@example.ingest.sentry.io/123",
      serverSentryDsn: "https://private@example.ingest.sentry.io/456",
    });

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://private@example.ingest.sentry.io/456",
        environment: "test",
        sendDefaultPii: false,
      }),
    );
  });

  it("loads the node bootstrap from instrumentation.register and forwards onRequestError", async () => {
    const { mod, sentry, loadServerConfig, loadEdgeConfig } = await loadInstrumentation("nodejs");

    await mod.register();

    expect(loadServerConfig).toHaveBeenCalledOnce();
    expect(loadEdgeConfig).not.toHaveBeenCalled();
    expect(mod.onRequestError).toBe(sentry.captureRequestError);
  });
});
