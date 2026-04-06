export const ADMIN_SESSION_AUTH = "Session";

export interface AdminSessionStatus {
  authenticated: boolean;
  microsoftSsoEnabled: boolean;
  admin?: {
    actor: string;
    authMethod: "basic" | "microsoft";
    email?: string;
    name?: string;
  };
}

export function resolveAdminAuthHeader(
  storedHeader: string | null | undefined,
  session: AdminSessionStatus | null,
): string {
  const normalizedStoredHeader = storedHeader?.trim() ?? "";
  if (normalizedStoredHeader.length > 0) {
    return normalizedStoredHeader;
  }

  return session?.authenticated ? ADMIN_SESSION_AUTH : "";
}

export function shouldPersistAdminAuthHeader(authHeader: string): boolean {
  const normalizedAuthHeader = authHeader.trim();
  return normalizedAuthHeader.length > 0 && normalizedAuthHeader !== ADMIN_SESSION_AUTH;
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
  return `${apiBase.replace(/\/$/, "")}/v1/admin/auth/microsoft/login?returnTo=${encodeURIComponent(returnTo)}`;
}
