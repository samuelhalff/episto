import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);

const appToggleGroupSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/app-toggle-group.tsx"),
  "utf8",
);

const bodyModeToolbarSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyModeToolbar.tsx"),
  "utf8",
);

const recipientFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientForm.tsx"),
  "utf8",
);

const themeToggleSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/ThemeToggle.tsx"),
  "utf8",
);

describe("toggle contrast regressions", () => {
  it("keeps shared segmented controls visibly defined in light mode through shell contrast", () => {
    expect(appToggleGroupSource).toContain("bg-[var(--app-surface-soft)]");
    expect(appToggleGroupSource).toContain(
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
    );
    expect(appToggleGroupSource).toContain("rounded-xl");
    expect(appToggleGroupSource).toContain("rounded-lg");
    expect(appToggleGroupSource).toContain("bg-[var(--action-choice-active-bg)]");
    expect(appToggleGroupSource).toContain("text-[var(--action-choice-active-fg)]");
    expect(appToggleGroupSource).toContain(
      "outline-[var(--action-choice-active-border)]",
    );
    expect(cardsSource).not.toContain("export function SegmentedControl");
  });

  it("routes draft-flow selectors through the shared app toggle component", () => {
    expect(recipientFormSource).toContain("AppToggleGroup");
    expect(bodyModeToolbarSource).toContain("AppToggleGroup");
  });

  it("keeps the theme toggle track visible in light mode through contrast instead of a hard border", () => {
    expect(themeToggleSource).toContain("AppToggleGroup");
    expect(themeToggleSource).toContain('variant="theme"');
    expect(appToggleGroupSource).toContain(
      "border border-[var(--app-border)] bg-[var(--app-surface-soft)]",
    );
    expect(appToggleGroupSource).toContain(
      "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    );
    expect(appToggleGroupSource).toContain(
      '<span className={compact ? "whitespace-nowrap" : "min-w-0 truncate"}>',
    );
  });

  it("gives the non-compact theme toggle roomier labeled buttons than the header-sized variant", () => {
    expect(appToggleGroupSource).toContain('"shrink-0 gap-1 p-1"');
    expect(appToggleGroupSource).toContain(
      '"app-list-item w-full gap-1.5 p-1.5 transition-all duration-300 hover:-translate-y-0.5"',
    );
    expect(appToggleGroupSource).toContain(
      '"min-h-10 min-w-[5rem] gap-1.5 px-3 text-xs whitespace-nowrap"',
    );
    expect(appToggleGroupSource).toContain('"min-h-11 gap-2.5 px-4 py-2.5 text-sm"');
    expect(appToggleGroupSource).not.toContain("translate-x-10");
    expect(appToggleGroupSource).not.toContain("selectedIndex");
  });

  it("lets shared segmented toggles shrink to their container instead of forcing fixed option widths", () => {
    expect(appToggleGroupSource).toContain("inline-flex w-full min-w-0");
    expect(appToggleGroupSource).toContain("overflow-hidden");
    expect(appToggleGroupSource).toContain(
      "inline-flex min-w-0 flex-1 items-center justify-center",
    );
    expect(appToggleGroupSource).toContain("min-h-11");
  });
});
