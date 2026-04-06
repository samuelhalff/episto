import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../../shared/config/index.js";

export interface MicrosoftTokenExchange {
  idToken: string;
  accessToken?: string;
}

export interface MicrosoftAdminIdentity {
  email?: string;
  name?: string;
  oid: string;
  tid: string;
}

let microsoftJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getAdminMicrosoftConfig(): {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
} {
  const config = env();

  if (
    !config.ADMIN_MICROSOFT_CLIENT_ID ||
    !config.ADMIN_MICROSOFT_CLIENT_SECRET ||
    !config.ADMIN_MICROSOFT_REDIRECT_URI
  ) {
    throw new Error("Admin Microsoft SSO is not fully configured");
  }

  return {
    clientId: config.ADMIN_MICROSOFT_CLIENT_ID,
    clientSecret: config.ADMIN_MICROSOFT_CLIENT_SECRET,
    tenantId: config.ADMIN_MICROSOFT_TENANT_ID,
    redirectUri: config.ADMIN_MICROSOFT_REDIRECT_URI,
  };
}

function getMicrosoftJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!microsoftJwks) {
    microsoftJwks = createRemoteJWKSet(
      new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys"),
    );
  }

  return microsoftJwks;
}

export async function exchangeMicrosoftCodeForTokens(
  code: string,
): Promise<MicrosoftTokenExchange> {
  const config = getAdminMicrosoftConfig();
  const response = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  const payload = (await response.json()) as {
    id_token?: unknown;
    access_token?: unknown;
    error_description?: unknown;
  };

  if (!response.ok) {
    throw new Error(
      typeof payload.error_description === "string"
        ? payload.error_description
        : "Microsoft token exchange failed",
    );
  }

  if (typeof payload.id_token !== "string" || payload.id_token.length === 0) {
    throw new Error("Microsoft token response missing id_token");
  }

  return {
    idToken: payload.id_token,
    ...(typeof payload.access_token === "string" && {
      accessToken: payload.access_token,
    }),
  };
}

export async function validateMicrosoftIdToken(
  idToken: string,
): Promise<MicrosoftAdminIdentity> {
  const config = getAdminMicrosoftConfig();
  const { payload } = await jwtVerify(idToken, getMicrosoftJwks(), {
    audience: config.clientId,
    algorithms: ["RS256"],
    clockTolerance: 60,
  });

  if (typeof payload.iss !== "string") {
    throw new Error("Microsoft ID token missing issuer");
  }

  if (
    !/^https:\/\/login\.microsoftonline\.com\/[a-z0-9-]+\/v2\.0$/i.test(payload.iss)
  ) {
    throw new Error(`Invalid Microsoft issuer: ${payload.iss}`);
  }

  if (typeof payload.tid !== "string" || payload.tid.length === 0) {
    throw new Error("Microsoft ID token missing tid claim");
  }

  const tenantIdFromIssuer = payload.iss.split("/")[3];
  if (tenantIdFromIssuer !== payload.tid) {
    throw new Error("Tenant ID mismatch between issuer and tid claim");
  }

  if (typeof payload.oid !== "string" || payload.oid.length === 0) {
    throw new Error("Microsoft ID token missing oid claim");
  }

  return {
    ...(typeof payload.email === "string" && payload.email.length > 0
      ? { email: payload.email }
      : typeof payload.preferred_username === "string" &&
          payload.preferred_username.length > 0
        ? { email: payload.preferred_username }
        : {}),
    ...(typeof payload.name === "string" && payload.name.length > 0
      ? { name: payload.name }
      : {}),
    oid: payload.oid,
    tid: payload.tid,
  };
}
