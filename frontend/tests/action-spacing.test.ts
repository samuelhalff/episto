import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const sheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/sheet.tsx"),
  "utf8",
);

const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const workspaceMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx"),
  "utf8",
);

describe("shared action spacing regressions", () => {
  it("keeps sheet footers on a shared vertical rhythm", () => {
    expect(sheetSource).toContain("flex flex-col gap-3 border-t");
  });

  it("keeps the body-step preview control out of the bottom dock", () => {
    expect(bodyStepSource).toContain("bodyModeToolbarClassName");
    expect(bodyStepSource).toContain(
      "// Keep preview in the sticky toolbar so it never widens the dock CTA row.",
    );
    expect(bodyStepSource).toContain("previewToolbarButton");
    expect(bodyStepSource).not.toContain('isCompactViewport ? "px-1"');
    expect(bodyStepSource).toContain("primaryAction={primaryCta}");
    expect(bodyStepSource).not.toContain("previewButton || primaryCta");
    expect(draftShellSource).toContain("relative sticky bottom-0 z-20");
    expect(draftShellSource).toContain("flex min-w-0 items-center gap-3");
  });

  it("anchors the workspace menu trigger to the same viewport slot as the sheet close action", () => {
    expect(workspaceMenuSource).toContain("fixed right-6");
    expect(workspaceMenuSource).toContain("sm:right-8");
    expect(workspaceMenuSource).toContain("lg:right-10");
    expect(workspaceMenuSource).toContain("SheetClose asChild");
  });
});
