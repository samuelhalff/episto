import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadBuildApp(trustProxy: boolean) {
  vi.resetModules();

  vi.doMock("../src/shared/config/index.js", () => ({
    env: () => ({
      NODE_ENV: "test",
      CORS_ORIGIN: "http://localhost:5000",
      TRUST_PROXY: trustProxy,
    }),
  }));

  vi.doMock("../src/routes/health.js", () => ({
    healthRoutes: async () => {},
  }));

  vi.doMock("../src/modules/sessions/index.js", () => ({
    sessionRoutes: async () => {},
  }));

  vi.doMock("../src/modules/drafting/index.js", () => ({
    draftRoutes: async () => {},
    addressSearchRoutes: async () => {},
    streamRoutes: async () => {},
  }));

  vi.doMock("../src/modules/payments/index.js", () => ({
    paymentRoutes: async () => {},
  }));

  vi.doMock("../src/modules/dispatch/index.js", () => ({
    dispatchRoutes: async () => {},
  }));

  vi.doMock("../src/modules/messages/index.js", () => ({
    messageRoutes: async () => {},
  }));

  vi.doMock("../src/modules/files/index.js", () => ({
    fileRoutes: async () => {},
  }));

  vi.doMock("../src/modules/orders/index.js", () => ({
    orderRoutes: async () => {},
  }));

  vi.doMock("../src/modules/pricing/pricing.routes.js", () => ({
    pricingRoutes: async () => {},
  }));

  vi.doMock("../src/modules/admin/index.js", () => ({
    adminRoutes: async () => {},
    adminAuthRoutes: async () => {},
  }));

  return import("../src/app.js");
}

describe("proxy-aware request IP handling", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ignores X-Forwarded-For when trustProxy is disabled", async () => {
    const { buildApp } = await loadBuildApp(false);
    const app = await buildApp(pino({ level: "silent" }));
    app.get("/debug/ip", async (request) => ({ ip: request.ip }));

    const response = await app.inject({
      method: "GET",
      url: "/debug/ip",
      headers: {
        "x-forwarded-for": "198.51.100.10",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ip: expect.not.stringContaining("198.51.100.10"),
    });

    await app.close();
  });

  it("uses X-Forwarded-For when trustProxy is enabled", async () => {
    const { buildApp } = await loadBuildApp(true);
    const app = await buildApp(pino({ level: "silent" }));
    app.get("/debug/ip", async (request) => ({ ip: request.ip }));

    const response = await app.inject({
      method: "GET",
      url: "/debug/ip",
      headers: {
        "x-forwarded-for": "198.51.100.10",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ip: "198.51.100.10" });

    await app.close();
  });
});
