import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:5000",
  }),
}));

vi.mock("../src/routes/health.js", () => ({
  healthRoutes: async () => {},
}));

vi.mock("../src/modules/sessions/index.js", () => ({
  sessionRoutes: async () => {},
}));

vi.mock("../src/modules/drafting/index.js", () => ({
  draftRoutes: async () => {},
  addressSearchRoutes: async () => {},
  streamRoutes: async () => {},
  dictationRoutes: async () => {},
}));

vi.mock("../src/modules/payments/index.js", () => ({
  paymentRoutes: async () => {},
}));

vi.mock("../src/modules/dispatch/index.js", () => ({
  dispatchRoutes: async () => {},
}));

vi.mock("../src/modules/messages/index.js", () => ({
  messageRoutes: async () => {},
}));

vi.mock("../src/modules/files/index.js", () => ({
  fileRoutes: async () => {},
}));

vi.mock("../src/modules/orders/index.js", () => ({
  orderRoutes: async () => {},
}));

vi.mock("../src/modules/pricing/pricing.routes.js", () => ({
  pricingRoutes: async () => {},
}));

vi.mock("../src/modules/admin/index.js", () => ({
  adminRoutes: async (app: {
    get: (path: string, handler: () => Promise<{ ok: boolean }>) => void;
  }) => {
    app.get("/admin/overview", async () => ({ ok: true }));
  },
  adminAuthRoutes: async (app: {
    get: (path: string, handler: () => Promise<{ ok: boolean }>) => void;
  }) => {
    app.get("/admin/auth/session", async () => ({ ok: true }));
  },
}));

import { buildApp } from "../src/app.js";

describe("buildApp admin auth registration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers admin auth routes alongside protected admin routes", async () => {
    const app = await buildApp(pino({ level: "silent" }));

    const authResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
    });
    const adminResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
    });

    expect(authResponse.statusCode).toBe(200);
    expect(authResponse.json()).toEqual({ ok: true });
    expect(adminResponse.statusCode).toBe(200);
    expect(adminResponse.json()).toEqual({ ok: true });

    await app.close();
  });
});
