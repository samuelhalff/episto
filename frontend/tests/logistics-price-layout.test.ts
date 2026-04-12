import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);

describe("logistics price layout", () => {
  it("keeps delivery prices on a single line", () => {
    expect(logisticsStepSource).toMatch(
      /className=\{`shrink-0 whitespace-nowrap text-sm font-semibold \$\{[\s\S]*?\}`\}\s*>\s*\{registeredPrice\}/,
    );
    expect(logisticsStepSource).toMatch(
      /className=\{`shrink-0 whitespace-nowrap text-sm font-semibold \$\{[\s\S]*?\}`\}\s*>\s*\{standardPrice\}/,
    );
  });
});
