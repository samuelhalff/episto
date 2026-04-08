import { describe, expect, it } from "vitest";
import {
  getAdminBasePath,
  getAdminPagePath,
  getAdminSearchResultPath,
} from "../src/lib/admin-paths";

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

  it("routes draft-linked search results to the draft case page", () => {
    expect(
      getAdminSearchResultPath("/en-CH/admin/overview", {
        kind: "dispatch_attempt",
        id: "dispatch-1",
        draftId: "draft-1",
        sessionId: null,
      }),
    ).toBe("/en-CH/admin/drafts/draft-1");
  });

  it("routes session search results to the session detail page", () => {
    expect(
      getAdminSearchResultPath("/en-CH/admin/overview", {
        kind: "session",
        id: "session-1",
        draftId: null,
        sessionId: "session-1",
      }),
    ).toBe("/en-CH/admin/sessions/session-1");
  });
});
