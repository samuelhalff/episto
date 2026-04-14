import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const themeScriptSource = readFileSync(
  path.join(repoRoot, "frontend/src/lib/theme-script.ts"),
  "utf8",
);

const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);

describe("theme bootstrap", () => {
  it("marks the document as theme-ready before hydration when marketing chrome is gated on that flag", () => {
    expect(globalsCssSource).toContain(
      '[data-theme-ready="false"] [data-theme-chrome="marketing"]',
    );
    expect(themeScriptSource).toContain(
      'document.documentElement.dataset.themeReady = "true";',
    );
  });
});
