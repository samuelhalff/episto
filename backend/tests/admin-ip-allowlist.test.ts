import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mutable mock config so each test can control ADMIN_IP_ALLOWLIST
// ---------------------------------------------------------------------------

const mockConfig = vi.hoisted(() => ({
  ADMIN_IP_ALLOWLIST: "",
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => mockConfig,
}));

import { requireAllowlistedAdminIp } from "../src/shared/middleware/require-allowlisted-admin-ip.js";
import { AppError } from "../src/shared/errors/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Fastify app with a single GET route protected by the IP preHandler. */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send(error.toResponse());
      return;
    }
    reply.status(500).send({ error: { code: "INTERNAL", message: error.message } });
  });
  app.addHook("preHandler", requireAllowlistedAdminIp);
  app.get("/test", async (_request, reply) => {
    reply.send({ ok: true });
  });
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------

describe("requireAllowlistedAdminIp", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "";
    if (app) {
      await app.close();
    }
  });

  // -- Fail-safe: empty allowlist ------------------------------------------

  it("allows any IP when ADMIN_IP_ALLOWLIST is empty (fail-safe)", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "203.0.113.42",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("allows any IP when ADMIN_IP_ALLOWLIST is only whitespace", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "   ";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "198.51.100.7",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  // -- Allowlisted IPs -----------------------------------------------------

  it("allows an IP that is in the allowlist", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "10.0.0.1, 10.0.0.2";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "10.0.0.1",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("allows another IP that is in the allowlist", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "10.0.0.1, 10.0.0.2";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "10.0.0.2",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  // -- Denied IPs ----------------------------------------------------------

  it("returns 403 ADMIN_IP_NOT_ALLOWED when IP is not in the allowlist", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "10.0.0.1";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "203.0.113.99",
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error.code).toBe("ADMIN_IP_NOT_ALLOWED");
    expect(body.error.family).toBe("policy_refusal");
  });

  it("returns 403 when allowlist has multiple entries but none match", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "1.1.1.1, 2.2.2.2, 3.3.3.3";
    app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "4.4.4.4",
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("ADMIN_IP_NOT_ALLOWED");
  });

  it("trims whitespace from allowlist entries", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "  10.0.0.1 ,  10.0.0.2  ";
    app = await buildTestApp();

    const allowed = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "10.0.0.1",
    });
    expect(allowed.statusCode).toBe(200);

    const denied = await app.inject({
      method: "GET",
      url: "/test",
      remoteAddress: "10.0.0.3",
    });
    expect(denied.statusCode).toBe(403);
  });

  // -- Auth route coverage --------------------------------------------------

  /** Build a Fastify app with @fastify/cookie and adminAuthRoutes registered,
   *  including the AppError handler so error responses are properly formatted. */
  async function buildAuthApp(): Promise<FastifyInstance> {
    const { adminAuthRoutes } = await import("../src/modules/admin/admin-auth.routes.js");
    const fastifyCookie = (await import("@fastify/cookie")).default;

    const authApp = Fastify({ logger: false });
    authApp.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse());
        return;
      }
      reply.status(500).send({ error: { code: "INTERNAL", message: error.message } });
    });
    await authApp.register(fastifyCookie);
    await authApp.register(adminAuthRoutes);
    await authApp.ready();
    return authApp;
  }

  it("blocks access to admin auth routes from a non-allowlisted IP when the allowlist is set", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "10.0.0.1";

    const authApp = await buildAuthApp();

    const res = await authApp.inject({
      method: "GET",
      url: "/admin/auth/session",
      remoteAddress: "192.168.1.100",
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("ADMIN_IP_NOT_ALLOWED");

    await authApp.close();
  });

  it("allows access to admin auth routes when the allowlist is empty (fail-safe)", async () => {
    mockConfig.ADMIN_IP_ALLOWLIST = "";

    const authApp = await buildAuthApp();

    const res = await authApp.inject({
      method: "GET",
      url: "/admin/auth/session",
      remoteAddress: "192.168.1.100",
    });

    // Empty allowlist — must not block (the session endpoint returns 200 unauthenticated).
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      authenticated: false,
      microsoftSsoEnabled: false,
    });

    await authApp.close();
  });
});
