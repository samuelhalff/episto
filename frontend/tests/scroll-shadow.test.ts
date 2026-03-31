import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const scrollShadowSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/scroll-shadow.tsx"),
  "utf8",
);

const sheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/sheet.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const previewModalSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreviewModal.tsx"),
  "utf8",
);

const promptShortcutSheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/PromptShortcutSheet.tsx"),
  "utf8",
);

const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);

describe("scroll shadow regressions", () => {
  it("keeps a shared top and bottom shadow treatment for vertical scrollers", () => {
    expect(scrollShadowSource).toContain('type ScrollShadowSurface = "default" | "muted"');
    expect(scrollShadowSource).toContain("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden");
    expect(scrollShadowSource).toContain("min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-2");
    expect(scrollShadowSource).toContain('absolute inset-x-0 top-0');
    expect(scrollShadowSource).toContain('absolute inset-x-0 bottom-0');
    expect(scrollShadowSource).toContain('data-scroll-shadow-viewport="true"');
    expect(scrollShadowSource).toContain('from-[var(--app-surface-muted)]');
    expect(scrollShadowSource).toContain('from-[var(--app-surface-strong)]');
  });

  it("routes sheets and workspace scrolling through the shared shadow viewport", () => {
    expect(sheetSource).toContain("ScrollShadowViewport");
    expect(draftShellSource).toContain("<ScrollShadowViewport");
    expect(draftShellSource).toContain('surface="muted"');
    expect(previewModalSource).toContain('<SheetBody surface="muted"');
    expect(promptShortcutSheetSource).toContain('<SheetBody className="px-3 py-3 sm:px-4">');
    expect(stepOverlaySource).toContain('<SheetBody className="px-3 py-3 sm:px-4">');
  });
});
