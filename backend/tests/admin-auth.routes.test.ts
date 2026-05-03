import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_OAUTH_STATE_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  createAdminOauthStateToken,
  createAdminSessionToken,
} from "../src/modules/admin/admin-auth.js";
import {
  exchangeMicrosoftCodeForTokens,
  validateMicrosoftIdToken,
} from "../src/modules/admin/admin-microsoft.js";

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

describe("adminAuthRoutes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.mocked(exchangeMicrosoftCodeForTokens).mockReset();
    vi.mocked(validateMicrosoftIdToken).mockReset();
    app = Fastify();
    await app.register(fastifyCookie);
    await app.register(adminAuthRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns unauthenticated when no admin session cookie is present", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/session",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authenticated: false,
      microsoftSsoEnabled: true,
    });
  });

  it("returns the authenticated admin from a valid session cookie", async () => {
    const token = createAdminSessionToken(
      {
        actor: "sam@example.com",
        authMethod: "microsoft",
        email: "sam@example.com",
        name: "Sam",
        oid: "oid-123",
        tid: "tid-456",
      },
      "admin-session-secret-at-least-32-characters",
      Date.now() + 60_000,
    );

    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/session",
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authenticated: true,
      microsoftSsoEnabled: true,
      admin: {
        actor: "sam@example.com",
        authMethod: "microsoft",
        email: "sam@example.com",
        name: "Sam",
      },
    });
  });

  it("redirects to Microsoft and sets a signed OAuth state cookie", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/login?returnTo=%2Fen-CH%2Fhealth",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(
      "https://login.microsoftonline.com/westbaysa-tenant/oauth2/v2.0/authorize",
    );
    expect(response.headers.location).toContain("client_id=episto-client-id");
    expect(response.headers.location).toContain(
      encodeURIComponent("http://localhost:4000/api/v1/admin/auth/microsoft/callback"),
    );
    expect(response.headers["set-cookie"]).toEqual(
      expect.stringContaining("admin_oauth_state="),
    );
  });

  it("uses the current public request origin for the Microsoft callback redirect", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/login?returnTo=%2Fen-CH%2Fhealth",
      headers: {
        host: "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(
      encodeURIComponent("https://app.example.com/api/v1/admin/auth/microsoft/callback"),
    );
    expect(response.headers.location).not.toContain(
      encodeURIComponent("http://localhost:4000/api/v1/admin/auth/microsoft/callback"),
    );
  });

  it("falls back to the configured callback URI when the request host is the internal backend service", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/login?returnTo=%2Fen-CH%2Fhealth",
      headers: {
        host: "backend:4000",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(
      encodeURIComponent("http://localhost:4000/api/v1/admin/auth/microsoft/callback"),
    );
    expect(response.headers.location).not.toContain(
      encodeURIComponent("https://backend:4000/api/v1/admin/auth/microsoft/callback"),
    );
  });

  it("clears the admin session cookie on logout", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/auth/logout",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining(`${ADMIN_SESSION_COOKIE_NAME}=;`)]),
    );
  });

  it("exchanges the callback code, creates an admin session for a matching tenant, and redirects back", async () => {
    vi.mocked(exchangeMicrosoftCodeForTokens).mockResolvedValue({
      idToken: "microsoft-id-token",
    });
    vi.mocked(validateMicrosoftIdToken).mockResolvedValue({
      email: "sam@example.com",
      name: "Sam",
      oid: "oid-123",
      tid: "westbaysa-tenant",
    });

    const stateToken = createAdminOauthStateToken(
      {
        state: "state-123",
        returnTo: "/en-CH/sessions",
      },
      "admin-session-secret-at-least-32-characters",
      Date.now() + 60_000,
    );

    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/callback?code=code-123&state=state-123",
      headers: {
        cookie: `${ADMIN_OAUTH_STATE_COOKIE_NAME}=${stateToken}`,
        host: "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/en-CH/sessions");
    expect(exchangeMicrosoftCodeForTokens).toHaveBeenCalledWith(
      "code-123",
      "https://app.example.com/api/v1/admin/auth/microsoft/callback",
    );
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${ADMIN_SESSION_COOKIE_NAME}=`),
        expect.stringContaining(`${ADMIN_OAUTH_STATE_COOKIE_NAME}=;`),
      ]),
    );
  });

  it("falls back to the configured callback URI for token exchange when the request host is the internal backend service", async () => {
    vi.mocked(exchangeMicrosoftCodeForTokens).mockResolvedValue({
      idToken: "microsoft-id-token",
    });
    vi.mocked(validateMicrosoftIdToken).mockResolvedValue({
      email: "sam@example.com",
      name: "Sam",
      oid: "oid-123",
      tid: "westbaysa-tenant",
    });

    const stateToken = createAdminOauthStateToken(
      {
        state: "state-123",
        returnTo: "/en-CH/sessions",
      },
      "admin-session-secret-at-least-32-characters",
      Date.now() + 60_000,
    );

    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/callback?code=code-123&state=state-123",
      headers: {
        cookie: `${ADMIN_OAUTH_STATE_COOKIE_NAME}=${stateToken}`,
        host: "backend:4000",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(exchangeMicrosoftCodeForTokens).toHaveBeenCalledWith(
      "code-123",
      "http://localhost:4000/api/v1/admin/auth/microsoft/callback",
    );
  });

  it("redirects back with access denied when the Microsoft tenant does not match", async () => {
    vi.mocked(exchangeMicrosoftCodeForTokens).mockResolvedValue({
      idToken: "microsoft-id-token",
    });
    vi.mocked(validateMicrosoftIdToken).mockResolvedValue({
      email: "sam@example.com",
      name: "Sam",
      oid: "oid-999",
      tid: "other-tenant",
    });

    const stateToken = createAdminOauthStateToken(
      {
        state: "state-123",
        returnTo: "/en-CH/overview",
      },
      "admin-session-secret-at-least-32-characters",
      Date.now() + 60_000,
    );

    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/callback?code=code-123&state=state-123",
      headers: {
        cookie: `${ADMIN_OAUTH_STATE_COOKIE_NAME}=${stateToken}`,
        host: "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/en-CH/overview?authError=access_denied");
    expect(response.headers["set-cookie"]).toEqual(
      expect.stringContaining(`${ADMIN_OAUTH_STATE_COOKIE_NAME}=;`),
    );
  });

  it("redirects back with auth_failed when the identity has no usable email", async () => {
    vi.mocked(exchangeMicrosoftCodeForTokens).mockResolvedValue({
      idToken: "microsoft-id-token",
    });
    vi.mocked(validateMicrosoftIdToken).mockResolvedValue({
      // no email field
      name: "Sam",
      oid: "oid-123",
      tid: "westbaysa-tenant",
    });

    const stateToken = createAdminOauthStateToken(
      {
        state: "state-123",
        returnTo: "/en-CH/overview",
      },
      "admin-session-secret-at-least-32-characters",
      Date.now() + 60_000,
    );

    const response = await app.inject({
      method: "GET",
      url: "/admin/auth/microsoft/callback?code=code-123&state=state-123",
      headers: {
        cookie: `${ADMIN_OAUTH_STATE_COOKIE_NAME}=${stateToken}`,
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/en-CH/overview?authError=auth_failed");
  });
});
