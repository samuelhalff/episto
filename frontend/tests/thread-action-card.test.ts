import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);

describe("thread action card regressions", () => {
  it("keeps the CTA full width on mobile but caps it on desktop", () => {
    expect(cardsSource).toContain('<div className="w-full sm:max-w-sm">');
    expect(cardsSource).toContain("<PrimaryButton onClick={onAction} disabled={disabled}>");
  });
});
