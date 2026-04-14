/**
 * Regression: Admin dashboard responsive UI must preserve all navigation,
 * layout, and interaction affordances.
 *
 * User stories:
 * - "As an admin on desktop, I see a static 220px sidebar with all nav links."
 * - "As an admin on mobile, I see a hamburger menu that opens a slide-in drawer."
 * - "As an admin, the sidebar has all navigation sections: Dashboard, Operations, System."
 * - "As an admin, the top bar shows my initials, a search button, and the page title."
 * - "As an admin, the shell passes sidebarOpen/onClose/onMenuToggle correctly."
 * - "As an admin, clicking a nav link in the mobile drawer closes the drawer."
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const sidebarSource = readSource("frontend/src/app/[locale]/admin/admin-sidebar.tsx");
const topBarSource = readSource("frontend/src/app/[locale]/admin/admin-top-bar.tsx");
const shellSource = readSource("frontend/src/app/[locale]/admin/admin-shell.tsx");
const pageSpacingSource = readSource("frontend/src/components/layout/page-spacing.ts");

describe("regression: admin responsive dashboard", () => {
  // ── Sidebar ──

  it("sidebar accepts open and onClose props", () => {
    expect(sidebarSource).toContain("open: boolean");
    expect(sidebarSource).toContain("onClose: () => void");
  });

  it("sidebar has a mobile overlay backdrop", () => {
    expect(sidebarSource).toContain("fixed inset-0");
    expect(sidebarSource).toContain("bg-black/50");
    expect(sidebarSource).toContain("lg:hidden");
  });

  it("sidebar has a mobile slide-in drawer with translate animation", () => {
    expect(sidebarSource).toContain("translate-x-0");
    expect(sidebarSource).toContain("-translate-x-full");
    expect(sidebarSource).toContain("transition-transform");
  });

  it("sidebar has a desktop-only static nav (hidden on mobile)", () => {
    expect(sidebarSource).toContain("hidden");
    expect(sidebarSource).toContain("lg:flex");
    expect(sidebarSource).toContain("w-[220px]");
  });

  it("sidebar has a close button visible only on mobile", () => {
    expect(sidebarSource).toContain("lg:hidden");
    expect(sidebarSource).toContain('aria-label="Close menu"');
  });

  it("sidebar includes all three navigation sections", () => {
    expect(sidebarSource).toContain('"Dashboard"');
    expect(sidebarSource).toContain('"Operations"');
    expect(sidebarSource).toContain('"System"');
  });

  it("sidebar includes all expected nav items", () => {
    const expectedHrefs = [
      "overview",
      "funnel",
      "search",
      "sessions",
      "flags",
      "retention",
      "health",
    ];
    for (const href of expectedHrefs) {
      expect(sidebarSource).toContain(`href: "${href}"`);
    }
  });

  it("sidebar calls onClose when a nav link is clicked (mobile drawer dismiss)", () => {
    expect(sidebarSource).toContain("onClick={onClose}");
  });

  it("sidebar has a sign-out button", () => {
    expect(sidebarSource).toContain("Sign Out");
    expect(sidebarSource).toContain("logout");
  });

  // ── Top Bar ──

  it("top bar accepts onMenuToggle prop", () => {
    expect(topBarSource).toContain("onMenuToggle: () => void");
  });

  it("top bar has a hamburger menu button visible only on mobile", () => {
    expect(topBarSource).toContain("lg:hidden");
    expect(topBarSource).toContain('aria-label="Toggle menu"');
    expect(topBarSource).toContain("onMenuToggle");
  });

  it("top bar displays the page title from route meta", () => {
    expect(topBarSource).toContain("routeMeta.title");
    expect(topBarSource).toContain("routeMeta.description");
  });

  it("top bar has a search button", () => {
    expect(topBarSource).toContain("searchHref");
    expect(topBarSource).toContain('aria-label={t("shell.search")}');
  });

  it("top bar shows admin initials in an avatar", () => {
    expect(topBarSource).toContain("initials");
    expect(topBarSource).toContain("accountHref");
  });

  it("top bar keeps the search and account pills on the same responsive height", () => {
    expect(topBarSource).toContain("inline-flex h-11");
    expect(topBarSource).toContain("flex h-11 min-w-0");
  });

  it("top bar keeps the avatar circle fixed and centered on narrow layouts", () => {
    expect(topBarSource).toContain("h-9 w-9 shrink-0");
    expect(topBarSource).toContain("items-center justify-center rounded-full");
  });

  it("top bar supports all admin routes including retention", () => {
    expect(topBarSource).toContain("/admin/retention");
    expect(topBarSource).toContain("retention.title");
  });

  it("top bar is sticky with backdrop blur", () => {
    expect(topBarSource).toContain("sticky top-0");
    expect(topBarSource).toContain("backdrop-blur");
  });

  // ── Shell ──

  it("shell manages sidebarOpen state", () => {
    expect(shellSource).toContain("sidebarOpen");
    expect(shellSource).toContain("setSidebarOpen");
  });

  it("shell passes open and onClose to AdminSidebar", () => {
    expect(shellSource).toContain("open={sidebarOpen}");
    expect(shellSource).toContain("onClose={");
  });

  it("shell passes onMenuToggle to AdminTopBar", () => {
    expect(shellSource).toContain("onMenuToggle={");
  });

  it("shell uses responsive padding for main content", () => {
    expect(shellSource).toContain("ADMIN_SHELL_MAIN_CLASS_NAME");
    expect(pageSpacingSource).toContain("ADMIN_SHELL_MAIN_CLASS_NAME =");
    expect(pageSpacingSource).toContain("px-4 py-5");
    expect(pageSpacingSource).toContain("sm:px-6 sm:py-6");
    expect(pageSpacingSource).toContain("lg:px-8 lg:py-8");
  });

  it("shell still renders auth loading state", () => {
    expect(shellSource).toContain("animate-spin");
    expect(shellSource).toContain("!ready");
  });

  it("shell still renders Microsoft SSO login when not authenticated", () => {
    expect(shellSource).toContain("microsoftSsoEnabled");
    expect(shellSource).toContain("handleMicrosoftLogin");
    expect(shellSource).toContain("buildAdminMicrosoftLoginUrl");
  });

  it("shell still renders children in the main content area", () => {
    expect(shellSource).toContain("{children}");
    expect(shellSource).toContain('id="main-content"');
  });
});
