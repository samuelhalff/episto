import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);

const letterPreviewModalSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreviewModal.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);

describe("workspace layout regressions", () => {
  it("keeps preview sheets immersive instead of double-capping the reading width", () => {
    expect(letterPreviewSource).toContain('variant?: "default" | "immersive"');
    expect(letterPreviewSource).toContain('variant = "default"');
    expect(letterPreviewSource).toContain('max-w-[980px]');
    expect(letterPreviewSource).toContain("min-h-[640px]");
    expect(letterPreviewSource).toContain("!isImmersive");
    expect(letterPreviewSource).toContain('className="max-w-[220px] text-xs"');
    expect(letterPreviewSource).toContain('className="mt-6 ml-auto max-w-[260px] text-right"');
  });

  it("stacks preview actions in the footer with hide below confirm", () => {
    expect(letterPreviewModalSource).toContain("h-[100dvh] max-h-[100dvh] min-h-[100dvh]");
    expect(letterPreviewModalSource).toContain("rounded-none");
    expect(letterPreviewModalSource).toContain("flex-col gap-3");
    expect(letterPreviewModalSource).toContain('{t("confirmContent")}');
    expect(letterPreviewModalSource).toContain('{t("hidePreview")}');
    expect(letterPreviewModalSource).not.toContain("editBodyManuallyBadge");
    expect(letterPreviewModalSource).toContain('variant="immersive"');
  });

  it("keeps the draft shell overflow-safe on narrow screens", () => {
    expect(draftShellSource).toContain("ScrollShadowViewport");
    expect(draftShellSource).toContain("overflow-x-hidden");
    expect(draftShellSource).toContain("min-w-0");
    expect(draftShellSource).toContain("truncate text-sm");
    expect(draftShellSource).not.toContain("shouldHideDock");
  });

  it("keeps step lists shrinkable instead of forcing horizontal overflow", () => {
    expect(stepOverlaySource).toContain("flex min-w-0 w-full items-center");
    expect(stepOverlaySource).toContain("truncate text-xs");
  });
});
