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
      return "Your Microsoft account is not allowed to access the admin dashboard.";
    case "invalid_state":
      return "Your Microsoft sign-in expired. Please try again.";
    case "auth_failed":
      return "Microsoft sign-in failed. Please try again.";
    default:
      return null;
  }
}

export function buildAdminMicrosoftLoginUrl(apiBase: string, returnTo: string): string {
  return `${normalizeApiBase(apiBase)}/v1/admin/auth/microsoft/login?returnTo=${encodeURIComponent(returnTo)}`;
}
