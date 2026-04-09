import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const globalsSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);

const sheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/sheet.tsx"),
  "utf8",
);

const draftComposerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-composer.tsx"),
  "utf8",
);

const themeProviderSource = readFileSync(
  path.join(repoRoot, "frontend/src/lib/theme.tsx"),
  "utf8",
);

const themeToggleSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/ThemeToggle.tsx"),
  "utf8",
);

const marketingHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/Header.tsx"),
  "utf8",
);

const marketingFooterSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/Footer.tsx"),
  "utf8",
);

const privacyNoticeSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/PrivacyNoticeStrip.tsx"),
  "utf8",
);

const previewModalSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreviewModal.tsx"),
  "utf8",
);

const confirmDialogSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/ConfirmDialog.tsx"),
  "utf8",
);

const newDraftPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const tailwindConfigSource = readFileSync(
  path.join(repoRoot, "frontend/tailwind.config.ts"),
  "utf8",
);

describe("theme surface regressions", () => {
  it("keeps dark mode on layered slate surfaces instead of pure black shells", () => {
    expect(globalsSource).toContain("--app-bg: #0d1117;");
    expect(globalsSource).toContain("--app-surface-strong: #161b22;");
    expect(globalsSource).toContain("--app-surface-soft: #1b2430;");
    expect(globalsSource).toContain(".app-panel");
    expect(globalsSource).toContain(".app-panel-muted");
    expect(globalsSource).toContain(".app-field-surface");
    expect(globalsSource).toContain(".app-list-item");
  });

  it("keeps sheets, preview rails, and workspace shells on shared surface tokens", () => {
    expect(sheetSource).toContain("bg-[var(--app-surface-muted)]");
    expect(previewModalSource).toContain("bg-[var(--app-surface-soft)]");
    expect(draftShellSource).toContain("bg-[var(--app-surface-muted)]");
    expect(draftShellSource).not.toContain("dark:bg-zinc-950");
  });

  it("keeps the composer on shared panel and field surfaces", () => {
    expect(draftComposerSource).toContain("app-panel-muted");
    expect(draftComposerSource).toContain("app-field-surface");
  });

  it("keeps reusable theme and privacy controls on shared surface treatments", () => {
    expect(themeToggleSource).toContain("app-list-item");
    expect(themeToggleSource).not.toContain("bg-white/90");
    expect(privacyNoticeSource).toContain("app-sticky-bar");
    expect(privacyNoticeSource).toContain("inset-x-4");
    expect(privacyNoticeSource).toContain("bottom-4");
    expect(privacyNoticeSource).toContain('useTranslations("common")');
    expect(privacyNoticeSource).not.toContain("Sendly uses a single essential cookie");
  });

  it("keeps marketing chrome hidden until the resolved theme is known", () => {
    expect(themeProviderSource).toContain("hasResolvedTheme");
    expect(themeProviderSource).not.toContain("queueMicrotask");
    expect(marketingHeaderSource).toContain('data-theme-chrome="marketing"');
    expect(marketingFooterSource).toContain('data-theme-chrome="marketing"');
    expect(globalsSource).toContain('[data-theme-ready="false"] [data-theme-chrome="marketing"]');
  });

  it("keeps the shared section label style dark-mode safe", () => {
    expect(globalsSource).toContain(
      "text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500",
    );
  });

  it("reserves page scrollbar gutter space so checkout height changes do not shift the layout", () => {
    expect(globalsSource).toContain("scrollbar-gutter: stable;");
  });

  it("defines the action and semantic Tailwind color utilities used by the audited routes", () => {
    expect(tailwindConfigSource).toContain("primary:");
    expect(tailwindConfigSource).toContain('light: "var(--action-choice-active-bg)"');
    expect(tailwindConfigSource).toContain('success: "#16a34a"');
    expect(tailwindConfigSource).toContain('destructive: "#dc2626"');
  });

  it("keeps the draft entry page on the shared surface token in dark mode", () => {
    expect(newDraftPageSource).toContain("bg-[var(--app-surface-muted)]");
    expect(newDraftPageSource).not.toContain("dark:bg-zinc-950");
  });

  it("keeps confirmation dialogs on shared panel surfaces", () => {
    expect(confirmDialogSource).toContain("app-panel");
    expect(confirmDialogSource).not.toContain("border-zinc-200/80 bg-white");
  });
});
