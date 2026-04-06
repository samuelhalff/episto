import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const primitivesSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/primitives.tsx"),
  "utf8",
);
const finalCtaBandSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/FinalCTABand.tsx"),
  "utf8",
);
const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const marketingIconTokenPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/MarketingIconToken.tsx",
);
const marketingIconTokenSource = existsSync(marketingIconTokenPath)
  ? readFileSync(marketingIconTokenPath, "utf8")
  : "";

describe("marketing homepage shared visual primitives", () => {
  it("standardizes marketing section rhythm without the old desktop outlier", () => {
    expect(primitivesSource).toContain("py-16");
    expect(primitivesSource).toContain("lg:py-24");
    expect(primitivesSource).not.toContain("lg:py-28");
  });

  it("provides a shared padded marketing icon token", () => {
    expect(existsSync(marketingIconTokenPath)).toBe(true);
    expect(marketingIconTokenSource).toContain("h-12 w-12");
    expect(marketingIconTokenSource).toContain("rounded-full");
    expect(marketingIconTokenSource).toContain("size-5");
  });

  it("uses the primary yellow cta band treatment with dark text", () => {
    expect(finalCtaBandSource).toContain("text-zinc-950");
    expect(finalCtaBandSource).toContain("text-zinc-800/80");
    expect(finalCtaBandSource).not.toContain("text-white");
    expect(globalsCssSource).toContain(".marketing-cta-band");
    expect(globalsCssSource).toContain("var(--action-primary-bg)");
    expect(globalsCssSource).toContain("var(--action-primary-hover)");
    expect(globalsCssSource).not.toContain("linear-gradient(135deg, #b85c38 0%, #a04e2e 100%)");
  });
});
