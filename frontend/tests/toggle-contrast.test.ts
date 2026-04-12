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
    expect(appToggleGroupSource).toContain("app-field-surface");
    expect(appToggleGroupSource).toContain(
      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]",
    );
    expect(appToggleGroupSource).toContain(
      "dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]",
    );
  });
});
