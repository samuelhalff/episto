import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const languageSwitcherSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/LanguageSwitcher.tsx"),
  "utf8",
);

describe("language switcher architecture", () => {
  it("uses menu primitives instead of a hand-rolled popover listbox for the menu variant", () => {
    expect(languageSwitcherSource).toContain("DropdownMenu");
    expect(languageSwitcherSource).toContain("DropdownMenuRadioGroup");
    expect(languageSwitcherSource).toContain("DropdownMenuRadioItem");
    expect(languageSwitcherSource).not.toContain("Popover");
    expect(languageSwitcherSource).not.toContain("useEffect");
    expect(languageSwitcherSource).not.toContain("useRef");
    expect(languageSwitcherSource).not.toContain("KeyboardEvent");
    expect(languageSwitcherSource).not.toContain('role="listbox"');
    expect(languageSwitcherSource).not.toContain('role="option"');
  });
});
