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
    expect(cardsSource).toContain("bg-zinc-200/90");
    expect(cardsSource).toContain("shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]");
    expect(cardsSource).toContain('value === option.value');
    expect(cardsSource).toContain("bg-amber-100 text-amber-950 shadow-sm shadow-amber-200/60");
  });

  it("keeps the theme toggle track visible in light mode through contrast instead of a hard border", () => {
    expect(themeToggleSource).toContain("bg-zinc-200");
    expect(themeToggleSource).toContain("shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]");
    expect(themeToggleSource).toContain("dark:bg-zinc-800");
  });
});
