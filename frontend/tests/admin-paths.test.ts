import { describe, expect, it } from "vitest";
import { getAdminBasePath, getAdminPagePath } from "../src/lib/admin-paths";

describe("admin paths", () => {
  it("keeps the current locale when building the admin base path", () => {
    expect(getAdminBasePath("/en-CH/admin/overview")).toBe("/en-CH/admin");
  });

  it("defaults to the repository default locale when the pathname has none", () => {
    expect(getAdminBasePath("/overview")).toBe("/de-CH/admin");
  });

  it("builds nested admin page links under the locale-prefixed /admin path", () => {
    expect(getAdminPagePath("/fr-CH/admin/overview", "sessions/abc123")).toBe(
      "/fr-CH/admin/sessions/abc123",
    );
  });
});
