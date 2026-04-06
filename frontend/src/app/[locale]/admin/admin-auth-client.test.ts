import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_AUTH,
  buildAdminMicrosoftLoginUrl,
  getAdminAuthErrorMessage,
  resolveAdminAuthHeader,
  shouldPersistAdminAuthHeader,
} from "./admin-auth-client";

describe("admin-auth-client", () => {
  it("prefers a stored basic auth header over a cookie-backed session", () => {
    expect(
      resolveAdminAuthHeader("Basic abc123", {
        authenticated: true,
        microsoftSsoEnabled: true,
        admin: { actor: "sam@example.com", authMethod: "microsoft" },
      }),
    ).toBe("Basic abc123");
  });

  it("uses the session auth sentinel when the backend session is authenticated", () => {
    expect(
      resolveAdminAuthHeader("", {
        authenticated: true,
        microsoftSsoEnabled: true,
      }),
    ).toBe(ADMIN_SESSION_AUTH);
  });

  it("returns an empty auth header when no session is authenticated", () => {
    expect(
      resolveAdminAuthHeader(null, {
        authenticated: false,
        microsoftSsoEnabled: false,
      }),
    ).toBe("");
  });

  it("does not persist the cookie-backed session sentinel in session storage", () => {
    expect(shouldPersistAdminAuthHeader(ADMIN_SESSION_AUTH)).toBe(false);
    expect(shouldPersistAdminAuthHeader("Basic abc123")).toBe(true);
  });

  it("maps admin auth error codes to user-facing messages", () => {
    expect(getAdminAuthErrorMessage("access_denied")).toBe(
      "Your Microsoft account is not allowed to access the admin dashboard.",
    );
    expect(getAdminAuthErrorMessage("invalid_state")).toBe(
      "Your Microsoft sign-in expired. Please try again.",
    );
    expect(getAdminAuthErrorMessage("auth_failed")).toBe(
      "Microsoft sign-in failed. Please try again.",
    );
    expect(getAdminAuthErrorMessage("other")).toBeNull();
  });

  it("builds the backend Microsoft login URL with an encoded return target", () => {
    expect(
      buildAdminMicrosoftLoginUrl("/api", "/en-CH/overview?tab=system"),
    ).toBe(
      "/api/v1/admin/auth/microsoft/login?returnTo=%2Fen-CH%2Foverview%3Ftab%3Dsystem",
    );
  });
});
