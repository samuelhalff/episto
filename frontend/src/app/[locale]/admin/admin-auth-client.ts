import { normalizeApiBase } from "../../../lib/api";

export interface AdminSessionStatus {
  authenticated: boolean;
  microsoftSsoEnabled: boolean;
  admin?: {
    actor: string;
    authMethod: "microsoft";
    email?: string;
    name?: string;
  };
}

export function getAdminAuthErrorMessage(authError: string | null): string | null {
  switch (authError) {
    case "access_denied":
      return "login.errors.accessDenied";
    case "invalid_state":
      return "login.errors.invalidState";
    case "auth_failed":
      return "login.errors.authFailed";
    default:
      return null;
  }
}

export function buildAdminMicrosoftLoginUrl(apiBase: string, returnTo: string): string {
  return `${normalizeApiBase(apiBase)}/v1/admin/auth/microsoft/login?returnTo=${encodeURIComponent(returnTo)}`;
}
