import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const promptShortcutBarSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/PromptShortcutBar.tsx"),
  "utf8",
);

const promptShortcutSheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/PromptShortcutSheet.tsx"),
  "utf8",
);

describe("prompt shortcut UI regressions", () => {
  it("wires the disabled state through the inline shortcut bar and more trigger", () => {
    expect(promptShortcutBarSource).toContain("disabled={disabled}");
    expect(promptShortcutBarSource.match(/disabled=\{disabled\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the shortcut sheet visually interactive with icon and affordance chrome", () => {
    expect(promptShortcutSheetSource).toContain('import { ArrowUpRight, Sparkles } from "lucide-react";');
    expect(promptShortcutSheetSource).toContain("group relative flex w-full items-center gap-3");
    expect(promptShortcutSheetSource).toContain("<Sparkles className=\"h-4 w-4\" />");
    expect(promptShortcutSheetSource).toContain("<ArrowUpRight className=\"h-4 w-4\" />");
    expect(promptShortcutSheetSource).toContain("hover:-translate-y-0.5");
  });
});
