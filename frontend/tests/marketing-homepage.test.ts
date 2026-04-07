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
const homepageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/page.tsx"),
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
const homepageComponentPaths = {
  hero: path.join(repoRoot, "frontend/src/components/marketing/HomepageHero.tsx"),
  trustStrip: path.join(repoRoot, "frontend/src/components/marketing/TrustStrip.tsx"),
  howItWorks: path.join(
    repoRoot,
    "frontend/src/components/marketing/HowItWorksSteps.tsx",
  ),
  confidence: path.join(
    repoRoot,
    "frontend/src/components/marketing/ConfidenceBlock.tsx",
  ),
  useCases: path.join(repoRoot, "frontend/src/components/marketing/UseCaseGrid.tsx"),
} as const;
const localeMessagePaths = {
  "de-CH": path.join(repoRoot, "frontend/src/messages/de-CH.json"),
  "en-CH": path.join(repoRoot, "frontend/src/messages/en-CH.json"),
  "fr-CH": path.join(repoRoot, "frontend/src/messages/fr-CH.json"),
  "it-CH": path.join(repoRoot, "frontend/src/messages/it-CH.json"),
} as const;

function readJsonFile(pathname: string) {
  return JSON.parse(readFileSync(pathname, "utf8")) as Record<string, unknown>;
}

function getNestedValue(source: Record<string, unknown>, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, source);
}

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

  it("uses the primary yellow cta band treatment with enforced dark body contrast", () => {
    expect(homepageSource).toContain(
      'noteClassName="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70',
    );
    expect(finalCtaBandSource).toContain("text-zinc-950");
    expect(finalCtaBandSource).toContain("[&_p]:!text-zinc-800/80");
    expect(finalCtaBandSource).toContain("[&_p:first-of-type]:!text-zinc-950");
    expect(finalCtaBandSource).not.toContain("text-white");
    expect(globalsCssSource).toContain(".marketing-cta-band");
    expect(globalsCssSource).toContain("var(--action-primary-bg)");
    expect(globalsCssSource).toContain("var(--action-primary-hover)");
    expect(globalsCssSource).not.toContain(
      "linear-gradient(135deg, #b85c38 0%, #a04e2e 100%)",
    );
  });

  it("composes the homepage from focused marketing section components instead of inline sections", () => {
    expect(existsSync(homepageComponentPaths.hero)).toBe(true);
    expect(existsSync(homepageComponentPaths.trustStrip)).toBe(true);
    expect(existsSync(homepageComponentPaths.howItWorks)).toBe(true);
    expect(existsSync(homepageComponentPaths.confidence)).toBe(true);
    expect(existsSync(homepageComponentPaths.useCases)).toBe(true);

    expect(homepageSource).toContain("import { HomepageHero }");
    expect(homepageSource).toContain("import { TrustStrip }");
    expect(homepageSource).toContain("import { HowItWorksSteps }");
    expect(homepageSource).toContain("import { ConfidenceBlock }");
    expect(homepageSource).toContain("import { UseCaseGrid }");

    const heroIndex = homepageSource.indexOf("<HomepageHero />");
    const trustStripIndex = homepageSource.indexOf("<TrustStrip />");
    const howItWorksIndex = homepageSource.indexOf("<HowItWorksSteps />");
    const confidenceIndex = homepageSource.indexOf("<ConfidenceBlock />");
    const useCasesIndex = homepageSource.indexOf("<UseCaseGrid />");

    expect(heroIndex).toBeGreaterThan(-1);
    expect(trustStripIndex).toBeGreaterThan(heroIndex);
    expect(howItWorksIndex).toBeGreaterThan(trustStripIndex);
    expect(confidenceIndex).toBeGreaterThan(howItWorksIndex);
    expect(useCasesIndex).toBeGreaterThan(confidenceIndex);
    expect(homepageSource).not.toContain("const steps = [");
    expect(homepageSource).not.toContain("const useCases = [");
    expect(homepageSource).not.toContain("const trustItems = [");
    expect(homepageSource).not.toContain("function StepCard(");
    expect(homepageSource).not.toContain("function UseCaseCard(");
  });

  it("includes the confidence block in the homepage composition", () => {
    expect(homepageSource).toContain("<ConfidenceBlock />");
  });

  it("provides the expanded homepage trust, value, and use-case copy in every locale", () => {
    const requiredHomepageKeys = [
      "marketing.homepage.hero.body",
      "marketing.homepage.hero.proof",
      "marketing.homepage.hero.secondaryCta",
      "marketing.homepage.trustStrip.postal",
      "marketing.homepage.trustStrip.privacy",
      "marketing.homepage.trustStrip.encryption",
      "marketing.homepage.trustStrip.noAccount",
      "marketing.homepage.confidence.title",
      "marketing.homepage.confidence.intro",
      "marketing.homepage.confidence.cards.structured.title",
      "marketing.homepage.confidence.cards.structured.body",
      "marketing.homepage.confidence.cards.review.title",
      "marketing.homepage.confidence.cards.review.body",
      "marketing.homepage.confidence.cards.privacy.title",
      "marketing.homepage.confidence.cards.privacy.body",
      "marketing.homepage.useCases.lease.description",
      "marketing.homepage.useCases.complaint.description",
      "marketing.homepage.useCases.authority.description",
      "marketing.homepage.useCases.cancellation.description",
    ];

    for (const [locale, localePath] of Object.entries(localeMessagePaths)) {
      const messages = readJsonFile(localePath);

      for (const keyPath of requiredHomepageKeys) {
        expect(
          getNestedValue(messages, keyPath),
          `${locale} is missing ${keyPath}`,
        ).toBeTypeOf("string");
      }
    }
  });
});
