import { createHash, randomBytes } from "node:crypto";
import { URL } from "node:url";
import { z } from "zod";
import { env } from "../../../shared/config/index.js";

const SwissIdDiscoverySchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url().optional(),
  jwks_uri: z.string().url().optional(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
});

export type SwissIdDiscoveryDocument = z.infer<typeof SwissIdDiscoverySchema>;

export const SwissIdCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
    error_description: z.string().optional(),
  })
  .strict();

export interface SwissIdAuthTransientState {
  state: string;
  nonce: string;
  codeVerifier: string | null;
}

let cachedDiscovery:
  | { issuer: string; document: SwissIdDiscoveryDocument; fetchedAt: number }
  | undefined;

function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, "");
}

export function createSwissIdAuthTransientState(): SwissIdAuthTransientState {
  const codeVerifier = env().SWISSID_OIDC_ENABLE_PKCE
    ? randomBytes(32).toString("base64url")
    : null;

  return {
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    codeVerifier,
  };
}

export function buildPkceCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export async function loadSwissIdDiscovery(
  fetchImpl: typeof fetch = fetch,
): Promise<SwissIdDiscoveryDocument> {
  const issuer = env().SWISSID_OIDC_ISSUER;
  if (!issuer) {
    throw new Error("SWISSID_OIDC_ISSUER is not configured");
  }

  const normalizedIssuer = normalizeIssuer(issuer);
  if (
    cachedDiscovery &&
    cachedDiscovery.issuer === normalizedIssuer &&
    Date.now() - cachedDiscovery.fetchedAt < 5 * 60 * 1000
  ) {
    return cachedDiscovery.document;
  }

  const response = await fetchImpl(
    `${normalizedIssuer}/.well-known/openid-configuration`,
  );
  if (!response.ok) {
    throw new Error(`SwissID discovery failed with status ${response.status}`);
  }

  const document = SwissIdDiscoverySchema.parse(await response.json());
  cachedDiscovery = {
    issuer: normalizedIssuer,
    document,
    fetchedAt: Date.now(),
  };
  return document;
}

export function buildSwissIdAuthorizeUrl(input: {
  discovery: SwissIdDiscoveryDocument;
  state: string;
  nonce: string;
  codeVerifier?: string | null;
  loginHint?: string | null;
}): string {
  const redirectUri = env().SWISSID_OIDC_REDIRECT_URI;
  const clientId = env().SWISSID_OIDC_CLIENT_ID;

  if (!redirectUri || !clientId) {
    throw new Error(
      "SWISSID_OIDC_REDIRECT_URI and SWISSID_OIDC_CLIENT_ID are required to build the SwissID authorize URL",
    );
  }

  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", env().SWISSID_OIDC_SCOPES);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("purpose", env().SWISSID_OIDC_STEPUP_PURPOSE);

  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }

  if (input.codeVerifier) {
    url.searchParams.set("code_challenge", buildPkceCodeChallenge(input.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

export function parseSwissIdCallbackQuery(query: Record<string, unknown>): {
  state: string;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const parsed = SwissIdCallbackQuerySchema.parse(query);

  if (!parsed.state) {
    throw new Error("SwissID callback is missing state");
  }

  if (!parsed.code && !parsed.error) {
    throw new Error("SwissID callback is missing both code and error");
  }

  return {
    state: parsed.state,
    code: parsed.code ?? null,
    error: parsed.error ?? null,
    errorDescription: parsed.error_description ?? null,
  };
}
