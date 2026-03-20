/**
 * Microsoft Authentication Library (MSAL) configuration for admin SSO.
 *
 * Requires two environment variables:
 * - NEXT_PUBLIC_AZURE_CLIENT_ID — Azure AD app registration client ID
 * - NEXT_PUBLIC_AZURE_TENANT_ID — Azure AD tenant ID (or "common" for multi-tenant)
 *
 * When these are not set, the Microsoft SSO button is hidden and
 * the admin falls back to HTTP Basic Auth.
 */

import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "";
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "common";

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

/** MSAL instance — lazy singleton (only created when SSO is configured). */
let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication | null {
  if (!clientId) return null;
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}

export const loginRequest = {
  scopes: ["User.Read"],
};

/** Whether Microsoft SSO is configured via environment variables. */
export const isMsalConfigured = Boolean(clientId);
