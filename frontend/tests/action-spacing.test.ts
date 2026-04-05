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

const siteMenuPanelSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/SiteMenuPanel.tsx"),
  "utf8",
);

const workspaceSiteMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx"),
  "utf8",
);

describe("shared action spacing regressions", () => {
  it("keeps sheet footers on a shared vertical rhythm", () => {
    expect(sheetSource).toContain("flex flex-col gap-3 border-t");
    expect(sheetSource).toContain("pt-4");
  });

  it("keeps the body-step dock actions and workspace menu sections aligned to the shared spacing scale", () => {
    expect(bodyStepSource).toContain('className="flex items-center gap-3"');
    expect(siteMenuPanelSource).toContain('className="space-y-4"');
    expect(siteMenuPanelSource).toContain('className="space-y-5"');
    expect(workspaceSiteMenuSource).toContain('className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800"');
  });
});
