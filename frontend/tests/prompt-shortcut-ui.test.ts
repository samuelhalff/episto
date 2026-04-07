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

const promptShortcutHookSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/useMeasuredPromptShortcutLayout.ts",
  ),
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

  it("keeps the inline shortcut row on one line and measures overflow instead of wrapping", () => {
    expect(promptShortcutBarSource).toContain("useMeasuredPromptShortcutLayout");
    expect(promptShortcutBarSource).toContain("hasLeadingSlot: Boolean(leadingSlot)");
    expect(promptShortcutBarSource).toContain(
      'className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-hidden px-1 py-1"',
    );
    expect(promptShortcutBarSource).toContain('className="min-w-0 flex-1"');
    expect(promptShortcutBarSource).toContain('aria-hidden="true"');
    expect(promptShortcutBarSource).toContain("<ComposerBadge className={shortcutBadgeClassName}>");
    expect(promptShortcutBarSource).toContain("<ComposerBadge className={moreBadgeClassName}>");
    expect(promptShortcutBarSource).not.toContain('? "flex-wrap overflow-visible"');
    expect(promptShortcutHookSource).toContain("window.getComputedStyle(container)");
    expect(promptShortcutHookSource).toContain(
      "container.clientWidth - paddingLeft - paddingRight",
    );
    expect(promptShortcutSheetSource).toContain('<SheetBody className="px-4 py-4 sm:px-5">');
  });

  it("keeps hidden shortcut measurements clipped so they cannot widen the draft viewport", () => {
    expect(promptShortcutBarSource).toContain(
      'className="relative min-w-0 max-w-full overflow-hidden"',
    );
    expect(promptShortcutBarSource).toContain(
      'className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0"',
    );
    expect(promptShortcutBarSource).not.toContain(
      'className="pointer-events-none absolute left-0 top-0 -z-10 flex opacity-0"',
    );
  });
});
