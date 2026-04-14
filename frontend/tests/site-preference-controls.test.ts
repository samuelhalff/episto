import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const footerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/Footer.tsx"),
  "utf8",
);
const siteMenuPanelSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/SiteMenuPanel.tsx"),
  "utf8",
);
const headerLanguageMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/HeaderLanguageMenu.tsx"),
  "utf8",
);
const languageSwitcherSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/LanguageSwitcher.tsx"),
  "utf8",
);

describe("shared site preference controls", () => {
  it("keeps footer and menu language switching on the roomier shared menu trigger while the header stays compact", () => {
    expect(footerSource).toContain(
      '<LanguageSwitcher variant="menu" className="w-full sm:w-auto" />',
    );
    expect(siteMenuPanelSource).toContain(
      '<LanguageSwitcher variant="menu" className="w-full" />',
    );
    expect(headerLanguageMenuSource).toContain(
      '<LanguageSwitcher variant="menu" compact />',
    );
    expect(languageSwitcherSource).toContain(
      "const triggerLabel = compact ? activeLabel : activeLocaleName;",
    );
    expect(languageSwitcherSource).toContain(
      '"app-toolbar-button inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 py-0 text-sm font-semibold shadow-none"',
    );
    expect(languageSwitcherSource).toContain(
      '"group app-list-item inline-flex min-h-12 min-w-[10.5rem] max-w-full items-center justify-between gap-3 rounded-full px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)] shadow-none',
    );
  });

  it("lets roomy theme controls stretch to their parent containers instead of staying toolbar-sized", () => {
    expect(footerSource).toContain(
      '<ThemeToggle className="w-full justify-between sm:w-auto" />',
    );
    expect(siteMenuPanelSource).toContain(
      '<ThemeToggle className="w-full justify-between" />',
    );
    expect(footerSource).not.toContain("<ThemeToggle compact");
  });

  it("wraps the footer language switcher in Suspense because menu switching reads search params", () => {
    expect(footerSource).toContain('import { Suspense } from "react";');
    const suspenseRegex =
      /<Suspense[^>]*>[\s\S]*<LanguageSwitcher\s+variant="menu"\s+className="w-full sm:w-auto"\s*\/>[\s\S]*<\/Suspense>/;
    expect(footerSource).toMatch(suspenseRegex);
  });
});
