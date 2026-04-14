import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const pageSpacingPath = path.join(
  repoRoot,
  "frontend/src/components/layout/page-spacing.ts",
);
const legalLayoutPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/LegalPageLayout.tsx",
);

const marketingPrimitivesSource = readSource(
  "frontend/src/components/marketing/primitives.tsx",
);
const helpPageSource = readSource("frontend/src/app/[locale]/help/page.tsx");
const pricingTiersSource = readSource(
  "frontend/src/components/marketing/PricingTiers.tsx",
);
const pricingCtaSource = readSource("frontend/src/components/marketing/PricingCta.tsx");
const adminShellSource = readSource("frontend/src/app/[locale]/admin/admin-shell.tsx");
const checkoutPageSource = readSource(
  "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx",
);
const confirmationPageSource = readSource(
  "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx",
);
const reviewReadySource = readSource(
  "frontend/src/components/product/review/ReviewPageReady.tsx",
);
const statusPageSource = readSource(
  "frontend/src/app/[locale]/status/[orderToken]/page.tsx",
);
const termsPageSource = readSource("frontend/src/app/[locale]/terms/page.tsx");
const privacyPageSource = readSource("frontend/src/app/[locale]/privacy/page.tsx");
const imprintPageSource = readSource("frontend/src/app/[locale]/imprint/page.tsx");

describe("page spacing contracts", () => {
  it("defines shared spacing tokens for page shells and section densities", () => {
    expect(existsSync(pageSpacingPath)).toBe(true);

    const pageSpacingSource = readSource(
      "frontend/src/components/layout/page-spacing.ts",
    );

    expect(pageSpacingSource).toContain("MARKETING_SECTION_SPACING");
    expect(pageSpacingSource).toContain("LEGAL_PAGE_MAIN_CLASS_NAME");
    expect(pageSpacingSource).toContain("LEGAL_PAGE_HEADER_CLASS_NAME");
    expect(pageSpacingSource).toContain("ADMIN_SHELL_MAIN_CLASS_NAME");
    expect(pageSpacingSource).toContain("APP_PAGE_STACK_CLASS_NAME");
    expect(pageSpacingSource).toContain("NARROW_APP_PAGE_SHELL_CLASS_NAME");
  });

  it("lets marketing sections use shared density variants instead of route-local padding strings", () => {
    expect(marketingPrimitivesSource).toContain('spacing = "default"');
    expect(marketingPrimitivesSource).toContain("trimTop = false");
    expect(marketingPrimitivesSource).toContain("trimBottom = false");
    expect(marketingPrimitivesSource).toContain("getMarketingSectionClassName");
  });

  it("moves legal pages onto the shared legal shell and intro spacing", () => {
    expect(existsSync(legalLayoutPath)).toBe(true);

    const legalLayoutSource = readSource(
      "frontend/src/components/marketing/LegalPageLayout.tsx",
    );

    expect(legalLayoutSource).toContain("LEGAL_PAGE_MAIN_CLASS_NAME");
    expect(legalLayoutSource).toContain("LEGAL_PAGE_HEADER_CLASS_NAME");

    expect(termsPageSource).toContain("LegalPageLayout");
    expect(privacyPageSource).toContain("LegalPageLayout");
    expect(imprintPageSource).toContain("LegalPageLayout");

    expect(termsPageSource).not.toContain(
      'className="px-4 pb-16 pt-16 sm:px-6 md:pt-24"',
    );
    expect(privacyPageSource).not.toContain(
      'className="px-4 pb-16 pt-16 sm:px-6 md:pt-24"',
    );
    expect(imprintPageSource).not.toContain(
      'className="px-4 pb-16 pt-16 sm:px-6 md:pt-24"',
    );
  });

  it("replaces one-off marketing page paddings with shared section variants", () => {
    expect(helpPageSource).toContain('spacing="compact"');
    expect(helpPageSource).toContain('spacing="tight"');
    expect(helpPageSource).toContain("trimTop");

    expect(pricingTiersSource).toContain('spacing="tight"');
    expect(pricingTiersSource).toContain("trimTop");
    expect(pricingTiersSource).toContain("trimBottom");

    expect(pricingCtaSource).toContain('spacing="compact"');
    expect(pricingCtaSource).toContain("trimTop");
  });

  it("uses shared shell spacing in admin and customer flow pages", () => {
    expect(adminShellSource).toContain("ADMIN_SHELL_MAIN_CLASS_NAME");
    expect(checkoutPageSource).toContain("APP_PAGE_STACK_CLASS_NAME");
    expect(reviewReadySource).toContain("APP_PAGE_STACK_CLASS_NAME");
    expect(statusPageSource).toContain("APP_PAGE_STACK_CLASS_NAME");
    expect(confirmationPageSource).toContain("NARROW_APP_PAGE_SHELL_CLASS_NAME");
  });
});
