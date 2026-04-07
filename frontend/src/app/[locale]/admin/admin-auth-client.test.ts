import { describe, expect, it } from "vitest";
import {
  buildAdminMicrosoftLoginUrl,
  getAdminAuthErrorMessage,
} from "./admin-auth-client";

describe("admin-auth-client", () => {
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

  it("normalizes a bare backend origin when building the Microsoft login URL", () => {
    expect(
      buildAdminMicrosoftLoginUrl("http://localhost:4000", "/en-CH/admin"),
    ).toBe("http://localhost:4000/api/v1/admin/auth/microsoft/login?returnTo=%2Fen-CH%2Fadmin");
  });
});
