import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../shared/config/index.js";
import {
  ADMIN_OAUTH_STATE_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  createAdminOauthStateToken,
  createAdminSessionToken,
  verifyAdminOauthStateToken,
  verifyAdminSessionToken,
} from "./admin-auth.js";
import {
  exchangeMicrosoftCodeForTokens,
  validateMicrosoftIdToken,
} from "./admin-microsoft.js";

const ADMIN_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const ADMIN_MICROSOFT_CALLBACK_PATH = "/api/v1/admin/auth/microsoft/callback";

function isMicrosoftSsoConfigured(config = env()): boolean {
  return Boolean(
    config.ADMIN_SESSION_SECRET &&
    config.ADMIN_MICROSOFT_CLIENT_ID &&
    config.ADMIN_MICROSOFT_CLIENT_SECRET &&
    config.ADMIN_MICROSOFT_REDIRECT_URI &&
    config.ADMIN_MICROSOFT_TENANT_ID &&
    config.ADMIN_MICROSOFT_TENANT_ID !== "common",
  );
}

function isSecureCookie(request: FastifyRequest): boolean {
  return (
    env().NODE_ENV === "production" || request.headers["x-forwarded-proto"] === "https"
  );
}

function setAdminCookie(
  reply: FastifyReply,
  request: FastifyRequest,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  reply.setCookie(name, value, {
    httpOnly: true,
    secure: isSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

function clearAdminCookie(
  reply: FastifyReply,
  request: FastifyRequest,
  name: string,
): void {
  reply.setCookie(name, "", {
    httpOnly: true,
    secure: isSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function buildMicrosoftAuthorizeUrl(
  config: {
    ADMIN_MICROSOFT_TENANT_ID: string;
    ADMIN_MICROSOFT_CLIENT_ID: string;
  },
  redirectUri: string,
  state: string,
): string {
  const url = new URL(
    `https://login.microsoftonline.com/${config.ADMIN_MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`,
  );
  url.searchParams.set("client_id", config.ADMIN_MICROSOFT_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  return url.toString();
}

function appendAuthError(returnTo: string, authError: string): string {
  const url = new URL(returnTo, "http://admin.local");
  url.searchParams.set("authError", authError);
  return `${url.pathname}${url.search}${url.hash}`;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.split(",")[0]?.trim();
  }

  return value?.split(",")[0]?.trim();
}

function isRoutableCallbackHost(host: string): boolean {
  const normalizedHost = host.replace(/^\[|\]$/g, "");
  const hostName = normalizedHost.split(":")[0] ?? normalizedHost;

  if (hostName === "localhost" || hostName === "127.0.0.1" || hostName === "::1") {
    return true;
  }

  return hostName.includes(".");
}

function resolveAdminMicrosoftRedirectUri(
  request: FastifyRequest,
  configuredRedirectUri: string,
): string {
  const forwardedHost = firstHeaderValue(request.headers["x-forwarded-host"]);
  const host = forwardedHost ?? firstHeaderValue(request.headers.host);

  if (
    !host ||
    host === "localhost:80" ||
    host === "127.0.0.1:80" ||
    !isRoutableCallbackHost(host)
  ) {
    return configuredRedirectUri;
  }

  const forwardedProto = firstHeaderValue(request.headers["x-forwarded-proto"]);
  const protocol = forwardedProto ?? (isSecureCookie(request) ? "https" : "http");
  return `${protocol}://${host}${ADMIN_MICROSOFT_CALLBACK_PATH}`;
}

function readAdminSession(request: FastifyRequest) {
  const token = request.cookies[ADMIN_SESSION_COOKIE_NAME];
  const sessionSecret = env().ADMIN_SESSION_SECRET;

  if (!token || !sessionSecret) {
    return null;
  }

  return verifyAdminSessionToken(token, sessionSecret, Date.now());
}

export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/auth/session", async (request, reply) => {
    const config = env();
    const session = readAdminSession(request);
    const microsoftSsoEnabled = isMicrosoftSsoConfigured(config);

    if (!session) {
      reply.send({ authenticated: false, microsoftSsoEnabled });
      return;
    }

    reply.send({
      authenticated: true,
      microsoftSsoEnabled,
      admin: {
        actor: session.actor,
        authMethod: session.authMethod,
        ...(session.email !== undefined && { email: session.email }),
        ...(session.name !== undefined && { name: session.name }),
      },
    });
  });

  app.get(
    "/admin/auth/microsoft/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "5 minutes",
          keyGenerator: (req) => req.ip,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { returnTo?: string } }>, reply) => {
      const config = env();
      if (
        !config.ADMIN_SESSION_SECRET ||
        !config.ADMIN_MICROSOFT_CLIENT_ID ||
        !config.ADMIN_MICROSOFT_REDIRECT_URI ||
        !isMicrosoftSsoConfigured(config)
      ) {
        reply.status(404).send({ error: "Microsoft SSO is not configured" });
        return;
      }
      const redirectUri = resolveAdminMicrosoftRedirectUri(
        request,
        config.ADMIN_MICROSOFT_REDIRECT_URI,
      );

      const state = randomUUID();
      const returnTo = request.query.returnTo ?? "/en-CH/overview";
      const stateToken = createAdminOauthStateToken(
        { state, returnTo },
        config.ADMIN_SESSION_SECRET,
        Date.now() + ADMIN_OAUTH_STATE_TTL_SECONDS * 1000,
      );

      setAdminCookie(
        reply,
        request,
        ADMIN_OAUTH_STATE_COOKIE_NAME,
        stateToken,
        ADMIN_OAUTH_STATE_TTL_SECONDS,
      );

      reply.redirect(
        buildMicrosoftAuthorizeUrl(
          {
            ADMIN_MICROSOFT_TENANT_ID: config.ADMIN_MICROSOFT_TENANT_ID,
            ADMIN_MICROSOFT_CLIENT_ID: config.ADMIN_MICROSOFT_CLIENT_ID,
          },
          redirectUri,
          state,
        ),
      );
    },
  );

  app.get(
    "/admin/auth/microsoft/callback",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "5 minutes",
          keyGenerator: (req) => req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { code?: string; state?: string } }>,
      reply,
    ) => {
      const config = env();
      if (
        !config.ADMIN_SESSION_SECRET ||
        !config.ADMIN_MICROSOFT_REDIRECT_URI ||
        !isMicrosoftSsoConfigured(config)
      ) {
        reply.redirect(appendAuthError("/en-CH/overview", "auth_failed"));
        return;
      }
      const redirectUri = resolveAdminMicrosoftRedirectUri(
        request,
        config.ADMIN_MICROSOFT_REDIRECT_URI,
      );

      const stateToken = request.cookies[ADMIN_OAUTH_STATE_COOKIE_NAME];
      const stateClaims = stateToken
        ? verifyAdminOauthStateToken(stateToken, config.ADMIN_SESSION_SECRET, Date.now())
        : null;
      const defaultReturnTo = "/en-CH/overview";
      const returnTo = stateClaims?.returnTo ?? defaultReturnTo;

      clearAdminCookie(reply, request, ADMIN_OAUTH_STATE_COOKIE_NAME);

      if (!stateClaims || request.query.state !== stateClaims.state) {
        reply.redirect(appendAuthError(defaultReturnTo, "invalid_state"));
        return;
      }

      if (!request.query.code) {
        reply.redirect(appendAuthError(returnTo, "auth_failed"));
        return;
      }

      try {
        const { idToken } = await exchangeMicrosoftCodeForTokens(
          request.query.code,
          redirectUri,
        );
        const identity = await validateMicrosoftIdToken(idToken);
        const configuredTenantId = config.ADMIN_MICROSOFT_TENANT_ID;

        if (!configuredTenantId || configuredTenantId === "common") {
          reply.redirect(appendAuthError(returnTo, "auth_failed"));
          return;
        }

        if (
          identity.tid.trim().toLowerCase() !== configuredTenantId.trim().toLowerCase()
        ) {
          reply.redirect(appendAuthError(returnTo, "access_denied"));
          return;
        }

        const actorEmail = identity.email;
        if (!actorEmail) {
          reply.redirect(appendAuthError(returnTo, "auth_failed"));
          return;
        }

        const actor = actorEmail.trim().toLowerCase();

        const ttlSeconds = config.ADMIN_SESSION_TTL_HOURS * 3600;
        const sessionToken = createAdminSessionToken(
          {
            actor,
            authMethod: "microsoft",
            ...(identity.email !== undefined && { email: identity.email }),
            ...(identity.name !== undefined && { name: identity.name }),
            oid: identity.oid,
            tid: identity.tid,
          },
          config.ADMIN_SESSION_SECRET,
          Date.now() + ttlSeconds * 1000,
        );

        setAdminCookie(
          reply,
          request,
          ADMIN_SESSION_COOKIE_NAME,
          sessionToken,
          ttlSeconds,
        );
        reply.redirect(returnTo);
      } catch (error) {
        request.log.error({ err: error }, "Admin Microsoft SSO callback failed");
        reply.redirect(appendAuthError(returnTo, "auth_failed"));
      }
    },
  );

  app.post("/admin/auth/logout", async (request, reply) => {
    clearAdminCookie(reply, request, ADMIN_SESSION_COOKIE_NAME);
    clearAdminCookie(reply, request, ADMIN_OAUTH_STATE_COOKIE_NAME);
    reply.send({ ok: true });
  });
}
