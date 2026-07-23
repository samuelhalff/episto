import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const typographyPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/typography.tsx",
);
const auditedMarketingTextFiles = [
  "frontend/src/components/marketing/HomepageHero.tsx",
  "frontend/src/components/marketing/TrustStrip.tsx",
  "frontend/src/components/marketing/MarketingHero.tsx",
  "frontend/src/components/marketing/PricingFaq.tsx",
  "frontend/src/components/marketing/PricingTiers.tsx",
  "frontend/src/components/marketing/PricingSimulator.tsx",
  "frontend/src/components/marketing/pricing-shared.tsx",
  "frontend/src/components/marketing/LegalPageLayout.tsx",
  "frontend/src/components/marketing/LegalContent.tsx",
  "frontend/src/components/marketing/Header.tsx",
  "frontend/src/components/marketing/Footer.tsx",
  "frontend/src/components/marketing/LanguageSwitcher.tsx",
  "frontend/src/components/marketing/primitives.tsx",
] as const;
const auditedMarketingRouteTextFiles = [
  "frontend/src/components/marketing/FinalCTABand.tsx",
  "frontend/src/components/marketing/PricingFromText.tsx",
  "frontend/src/app/[locale]/help/page.tsx",
  "frontend/src/app/[locale]/privacy/page.tsx",
  "frontend/src/app/[locale]/terms/page.tsx",
] as const;
const auditedMarketingRouteConfigFiles = ["frontend/src/app/[locale]/page.tsx"] as const;
const bannedContentTextPatterns = [
  /text-zinc-950[^"'`\n]*dark:text-zinc-50/,
  /text-zinc-900[^"'`\n]*dark:text-zinc-100/,
  /text-zinc-700[^"'`\n]*dark:text-zinc-200/,
  /text-zinc-700[^"'`\n]*dark:text-zinc-300/,
  /text-zinc-600[^"'`\n]*dark:text-zinc-400/,
  /text-zinc-600[^"'`\n]*dark:text-zinc-300/,
  /text-zinc-500[^"'`\n]*dark:text-zinc-400/,
  /text-zinc-400[^"'`\n]*dark:text-zinc-500/,
  /text-zinc-500[^"'`\n]*dark:text-amber-200\/80/,
  /text-white[^"'`\n]*dark:text-zinc-950/,
  /text-white\/80/,
  /text-white\/70/,
] as const;
const bannedRouteTextPatterns = [
  ...bannedContentTextPatterns,
  /text-zinc-800\/80/,
] as const;

function readSourceOrEmpty(pathname: string) {
  return existsSync(pathname) ? readFileSync(pathname, "utf8") : "";
}

describe("marketing typography primitives", () => {
  it("defines shared theme-aware marketing text components", () => {
    const typographySource = readSourceOrEmpty(typographyPath);

    expect(existsSync(typographyPath)).toBe(true);
    expect(typographySource).toContain("export function MarketingHeading");
    expect(typographySource).toContain("export function MarketingBody");
    expect(typographySource).toContain("export function MarketingMeta");
    expect(typographySource).toContain('"default"');
    expect(typographySource).toContain("inverse");
  });

  it("routes audited marketing text surfaces through shared typography instead of raw theme text pairs", () => {
    const typographySource = readSourceOrEmpty(typographyPath);

    expect(typographySource).toContain("text-zinc-950 dark:text-zinc-50");
    expect(typographySource).toContain("text-zinc-600 dark:text-zinc-300");
    expect(typographySource).toContain("text-[var(--app-muted)] dark:text-zinc-500");

    for (const relativePath of auditedMarketingTextFiles) {
      const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

      expect(source, `${relativePath} should use shared marketing typography`).toMatch(
        /MarketingHeading|MarketingBody|MarketingMeta|getMarketing(?:Heading|Body|Meta)ToneClassName/,
      );

      for (const bannedPattern of bannedContentTextPatterns) {
        expect(
          source,
          `${relativePath} should not keep ${bannedPattern.toString()}`,
        ).not.toMatch(bannedPattern);
      }
    }
  });

  it("covers route-level marketing titles and subtitles with shared typography as well", () => {
    for (const relativePath of auditedMarketingRouteTextFiles) {
      const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

      expect(
        source,
        `${relativePath} should use shared marketing typography for route-level headings and subtitles`,
      ).toMatch(
        /MarketingHeading|MarketingBody|MarketingMeta|getMarketing(?:Heading|Body|Meta)ToneClassName/,
      );

      for (const bannedPattern of bannedRouteTextPatterns) {
        expect(
          source,
          `${relativePath} should not keep ${bannedPattern.toString()}`,
        ).not.toMatch(bannedPattern);
      }
    }

    for (const relativePath of auditedMarketingRouteConfigFiles) {
      const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

      for (const bannedPattern of bannedRouteTextPatterns) {
        expect(
          source,
          `${relativePath} should not keep ${bannedPattern.toString()}`,
        ).not.toMatch(bannedPattern);
      }
    }
  });
});
