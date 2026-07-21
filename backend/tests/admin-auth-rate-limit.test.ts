import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    NODE_ENV: "development",
    ADMIN_MICROSOFT_CLIENT_ID: "episto-client-id",
    ADMIN_MICROSOFT_CLIENT_SECRET: "episto-client-secret",
    ADMIN_MICROSOFT_TENANT_ID: "westbaysa-tenant",
    ADMIN_MICROSOFT_REDIRECT_URI:
      "http://localhost:4000/api/v1/admin/auth/microsoft/callback",
    ADMIN_SESSION_SECRET: "admin-session-secret-at-least-32-characters",
    ADMIN_SESSION_TTL_HOURS: 12,
  }),
}));

vi.mock("../src/modules/admin/admin-microsoft.js", () => ({
  exchangeMicrosoftCodeForTokens: vi.fn(),
  validateMicrosoftIdToken: vi.fn(),
}));

import { adminAuthRoutes } from "../src/modules/admin/admin-auth.routes.js";

describe("admin auth rate limiting", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: "1 minute",
      keyGenerator: (req) => req.ip,
    });
    await app.register(fastifyCookie);
    await app.register(adminAuthRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /admin/auth/microsoft/login", () => {
    it("allows up to 10 requests in 5 minutes and returns 302", async () => {
      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: "GET",
          url: "/admin/auth/microsoft/login",
        });
        expect(response.statusCode).toBe(302);
      }
    });

    it("returns 429 when exceeding 10 requests in 5 minutes", async () => {
      // Saturate the rate limit
      for (let i = 0; i < 10; i++) {
        await app.inject({
          method: "GET",
          url: "/admin/auth/microsoft/login",
        });
      }

      // 11th request should be rate-limited
      const response = await app.inject({
        method: "GET",
        url: "/admin/auth/microsoft/login",
      });
      expect(response.statusCode).toBe(429);
    });

    it("a single request returns 302 (not 429)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/admin/auth/microsoft/login",
      });
      expect(response.statusCode).toBe(302);
    });
  });

  describe("GET /admin/auth/microsoft/callback", () => {
    it("returns 429 when exceeding 10 requests in 5 minutes on callback", async () => {
      // Saturate the rate limit
      for (let i = 0; i < 10; i++) {
        await app.inject({
          method: "GET",
          url: "/admin/auth/microsoft/callback?code=test-code&state=test-state",
        });
      }

      // 11th request should be rate-limited
      const response = await app.inject({
        method: "GET",
        url: "/admin/auth/microsoft/callback?code=test-code&state=test-state",
      });
      expect(response.statusCode).toBe(429);
    });

    it("a single callback request is not rate-limited", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/admin/auth/microsoft/callback?code=test-code&state=test-state",
      });
      // Single request should be handled (redirect, not 429)
      expect(response.statusCode).not.toBe(429);
    });
  });
});
