import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const priceSummarySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/PriceSummary.tsx"),
  "utf8",
);
const reviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);

describe("price summary loading copy", () => {
  it("lets review override the active loading copy while quote calculation is in flight", () => {
    expect(priceSummarySource).toContain("loadingMessage?: string | undefined");
    expect(priceSummarySource).toContain('? loadingMessage ?? t("pricingLoading")');
    expect(reviewPageSource).toContain('loadingMessage={t("calculatingPriceDetail")}');
  });
});
