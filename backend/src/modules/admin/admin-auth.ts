import { createHmac, timingSafeEqual } from "node:crypto";

export interface AdminSessionClaimsInput {
  actor: string;
  authMethod: "microsoft";
  email?: string;
  name?: string;
  oid?: string;
  tid?: string;
}

export interface AdminSessionClaims extends AdminSessionClaimsInput {
  exp: number;
}

export interface AdminOauthStateClaimsInput {
  state: string;
  returnTo: string;
}

export interface AdminOauthStateClaims extends AdminOauthStateClaimsInput {
  exp: number;
}

function resolveAdminCookieName(): string {
  return process.env["NODE_ENV"] === "production"
    ? "__Host-admin-session"
    : "admin_session";
}

export const ADMIN_SESSION_COOKIE_NAME = resolveAdminCookieName();
export const ADMIN_OAUTH_STATE_COOKIE_NAME =
  process.env["NODE_ENV"] === "production"
    ? "__Host-admin-oauth-state"
    : "admin_oauth_state";

function signValue(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function verifySignedPayload<T extends { exp: number }>(
  token: string,
  secret: string,
  now: number,
): T | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as T;
    return payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

export function createAdminSessionToken(
  claims: AdminSessionClaimsInput,
  secret: string,
  expiresAt: number,
): string {
  const encodedPayload = encodePayload({ ...claims, exp: expiresAt });
  return `${encodedPayload}.${signValue(encodedPayload, secret)}`;
}

export function verifyAdminSessionToken(
  token: string,
  secret: string,
  now: number,
): AdminSessionClaims | null {
  return verifySignedPayload<AdminSessionClaims>(token, secret, now);
}

export function createAdminOauthStateToken(
  claims: AdminOauthStateClaimsInput,
  secret: string,
  expiresAt: number,
): string {
  const encodedPayload = encodePayload({ ...claims, exp: expiresAt });
  return `${encodedPayload}.${signValue(encodedPayload, secret)}`;
}

export function verifyAdminOauthStateToken(
  token: string,
  secret: string,
  now: number,
): AdminOauthStateClaims | null {
  return verifySignedPayload<AdminOauthStateClaims>(token, secret, now);
}
