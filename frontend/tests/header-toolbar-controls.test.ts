import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const headerLanguageMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/HeaderLanguageMenu.tsx"),
  "utf8",
);
const languageSwitcherSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/LanguageSwitcher.tsx"),
  "utf8",
);

const menuTriggerButtonSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/MenuTriggerButton.tsx"),
  "utf8",
);

const draftStepMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/DraftStepMenu.tsx"),
  "utf8",
);

describe("header toolbar controls", () => {
  it("uses the shared compact toolbar control pattern across the header controls", () => {
    expect(headerLanguageMenuSource).toContain(
      '<LanguageSwitcher variant="menu" compact />',
    );
    expect(languageSwitcherSource).toContain("app-toolbar-button");
    expect(menuTriggerButtonSource).toContain("app-toolbar-button");
    expect(draftStepMenuSource).toContain("app-toolbar-button");
  });
});
