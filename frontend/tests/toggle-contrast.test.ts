import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);

const themeToggleSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/ThemeToggle.tsx"),
  "utf8",
);

describe("toggle contrast regressions", () => {
  it("keeps segmented controls visibly defined in light mode through shell contrast", () => {
    expect(cardsSource).toContain("bg-[var(--app-surface-soft)]");
    expect(cardsSource).toContain("shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]");
    expect(cardsSource).toContain('value === option.value');
    expect(cardsSource).toContain('"app-choice-pill-active shadow-sm"');
  });

  it("keeps the theme toggle track visible in light mode through contrast instead of a hard border", () => {
    expect(themeToggleSource).toContain("app-field-surface");
    expect(themeToggleSource).toContain("shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]");
    expect(themeToggleSource).toContain("dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]");
  });
});
