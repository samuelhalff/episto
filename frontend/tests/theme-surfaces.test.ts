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

const previewModalSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreviewModal.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
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
});
