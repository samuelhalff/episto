import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { i18nState } = vi.hoisted(() => ({
  i18nState: { messages: {} as Record<string, unknown> },
}));

vi.mock("next-intl", () => {
  const getNested = (source: unknown, keyPath: string) =>
    keyPath.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[segment];
    }, source);

  const formatMessage = (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) =>
      String(values?.[key] ?? `{${key}}`),
    );

  return {
    useTranslations(namespace?: string) {
      return (key: string, values?: Record<string, unknown>) => {
        const base = namespace
          ? getNested(i18nState.messages, namespace)
          : i18nState.messages;
        const value = getNested(base, key);

        if (typeof value !== "string") {
          throw new Error(
            `Missing translation: ${namespace ? `${namespace}.` : ""}${key}`,
          );
        }

        return formatMessage(value, values);
      };
    },
  };
});

vi.mock("next-intl/server", () => {
  const getNested = (source: unknown, keyPath: string) =>
    keyPath.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[segment];
    }, source);

  const formatMessage = (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) =>
      String(values?.[key] ?? `{${key}}`),
    );

  return {
    async getTranslations(arg?: string | { locale?: string; namespace?: string }) {
      const namespace = typeof arg === "string" ? arg : arg?.namespace;
      return (key: string, values?: Record<string, unknown>) => {
        const base = namespace
          ? getNested(i18nState.messages, namespace)
          : i18nState.messages;
        const value = getNested(base, key);

        if (typeof value !== "string") {
          throw new Error(
            `Missing translation: ${namespace ? `${namespace}.` : ""}${key}`,
          );
        }

        return formatMessage(value, values);
      };
    },
  };
});

vi.mock("../src/i18n/navigation", async () => {
  const React = await import("react");

  return {
    Link: ({ href, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : String(href ?? "#"), ...props },
        children,
      ),
  };
});

vi.mock("../src/hooks/use-pricing", () => ({
  usePricing: () => ({ data: null }),
}));

// JsonLd is an async Server Component that reads the per-request nonce via
// `next/headers`. `renderToStaticMarkup` can't suspend, so replace it with a
// synchronous stub that preserves the escape semantics we still assert on.
vi.mock("../src/components/marketing/JsonLd", async () => {
  const React = await import("react");

  return {
    JsonLd: ({ data }: { data: unknown }) => {
      const html = JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
      return React.createElement("script", {
        type: "application/ld+json",
        dangerouslySetInnerHTML: { __html: html },
      });
    },
  };
});

vi.mock("../src/components/marketing/MarketingLayout", async () => {
  const React = await import("react");

  return {
    MarketingLayout: ({ children, mainClassName, ...props }: Record<string, unknown>) =>
      React.createElement(
        "main",
        {
          ...props,
          className:
            typeof mainClassName === "string"
              ? mainClassName
              : typeof props.className === "string"
                ? props.className
                : undefined,
        },
        children,
      ),
  };
});

import HomePage from "../src/app/[locale]/page";
import { ConfidenceBlock } from "../src/components/marketing/ConfidenceBlock";
import { HomepageHero } from "../src/components/marketing/HomepageHero";
import { HowItWorksSteps } from "../src/components/marketing/HowItWorksSteps";
import { TrustStrip } from "../src/components/marketing/TrustStrip";
import { UseCaseGrid } from "../src/components/marketing/UseCaseGrid";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const primitivesSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/primitives.tsx"),
  "utf8",
);
const pageSpacingSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/page-spacing.ts"),
  "utf8",
);
const finalCtaBandSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/FinalCTABand.tsx"),
  "utf8",
);
const pricingFromTextSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingFromText.tsx"),
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
const marketingFeatureSectionPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/MarketingFeatureSection.tsx",
);
const marketingFeatureSectionSource = existsSync(marketingFeatureSectionPath)
  ? readFileSync(marketingFeatureSectionPath, "utf8")
  : "";
const homepageComponentPaths = {
  hero: path.join(repoRoot, "frontend/src/components/marketing/HomepageHero.tsx"),
  windowDots: path.join(
    repoRoot,
    "frontend/src/components/marketing/MarketingWindowDots.tsx",
  ),
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

const requiredHomepageKeys = [
  "marketing.homepage.hero.badge",
  "marketing.homepage.hero.title",
  "marketing.homepage.hero.subtitle",
  "marketing.homepage.hero.primaryCta",
  "marketing.homepage.hero.secondaryCta",
  "marketing.homepage.hero.proof",
  "marketing.homepage.hero.steps.describe",
  "marketing.homepage.hero.steps.review",
  "marketing.homepage.hero.steps.send",
  "marketing.homepage.trustStrip.postal",
  "marketing.homepage.trustStrip.privacy",
  "marketing.homepage.trustStrip.encryption",
  "marketing.homepage.trustStrip.noAccount",
  "marketing.homepage.howItWorks.eyebrow",
  "marketing.homepage.howItWorks.title",
  "marketing.homepage.howItWorks.intro",
  "marketing.homepage.howItWorks.steps.describe.title",
  "marketing.homepage.howItWorks.steps.describe.body",
  "marketing.homepage.howItWorks.steps.review.title",
  "marketing.homepage.howItWorks.steps.review.body",
  "marketing.homepage.howItWorks.steps.send.title",
  "marketing.homepage.howItWorks.steps.send.body",
  "marketing.homepage.confidence.eyebrow",
  "marketing.homepage.confidence.title",
  "marketing.homepage.confidence.intro",
  "marketing.homepage.confidence.cards.structured.title",
  "marketing.homepage.confidence.cards.structured.body",
  "marketing.homepage.confidence.cards.review.title",
  "marketing.homepage.confidence.cards.review.body",
  "marketing.homepage.confidence.cards.privacy.title",
  "marketing.homepage.confidence.cards.privacy.body",
  "marketing.homepage.useCases.eyebrow",
  "marketing.homepage.useCases.title",
  "marketing.homepage.useCases.intro",
  "marketing.homepage.useCases.cancellation.title",
  "marketing.homepage.useCases.cancellation.description",
  "marketing.homepage.useCases.lease.title",
  "marketing.homepage.useCases.lease.description",
  "marketing.homepage.useCases.complaint.title",
  "marketing.homepage.useCases.complaint.description",
  "marketing.homepage.useCases.authority.title",
  "marketing.homepage.useCases.authority.description",
] as const;

type LocaleKey = keyof typeof localeMessagePaths;
type MessageTree = Record<string, unknown>;

type RenderableComponent = () => React.ReactElement;

globalThis.React = React;

function readJsonFile(pathname: string) {
  return JSON.parse(readFileSync(pathname, "utf8")) as MessageTree;
}

function getNestedValue(source: unknown, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as MessageTree)[segment];
  }, source);
}

function readLocaleMessages(locale: LocaleKey) {
  return readJsonFile(localeMessagePaths[locale]);
}

function renderWithMessages(Component: RenderableComponent, messages: MessageTree) {
  i18nState.messages = messages;
  return renderToStaticMarkup(React.createElement(Component));
}

async function renderHomePageWithMessages(locale: LocaleKey, messages: MessageTree) {
  i18nState.messages = messages;
  const page = await HomePage({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(page);
}

describe("marketing homepage shared visual primitives", () => {
  it("standardizes marketing section rhythm without the old desktop outlier", () => {
    expect(primitivesSource).toContain("getMarketingSectionClassName");
    expect(pageSpacingSource).toContain('base: "px-4 py-16 sm:px-6 sm:py-20 lg:py-24"');
    expect(pageSpacingSource).not.toContain("lg:py-28");
  });

  it("provides a shared padded marketing icon token", () => {
    expect(existsSync(marketingIconTokenPath)).toBe(true);
    expect(marketingIconTokenSource).toContain("h-12 w-12");
    expect(marketingIconTokenSource).toContain("rounded-full");
    expect(marketingIconTokenSource).toContain("size-5");
  });

  it("provides shared landing-page primitives for repeated section structures", () => {
    expect(primitivesSource).toContain("export function SectionHeader");
    expect(primitivesSource).toContain("export function SectionGrid");
    expect(primitivesSource).toContain("export function MarketingInfoPill");
  });

  it("supports richer icon tones for landing-page pills and feature cards", () => {
    expect(marketingIconTokenSource).toContain("export type MarketingIconTone");
    expect(marketingIconTokenSource).toContain("text-sky-700");
    expect(marketingIconTokenSource).toContain("text-emerald-700");
    expect(marketingIconTokenSource).toContain("text-amber-700");
    expect(marketingIconTokenSource).toContain("text-rose-700");
  });

  it("restores the hero as a full-height split section with stronger contrast and a visual companion panel", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("min-h-[calc(100svh-5rem)]");
    expect(heroSource).toContain("lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]");
    expect(heroSource).toContain('variant="heroSecondary"');
    expect(heroSource).toContain("paper-noise");
  });

  it("avoids numeric badges in the landing-page step visuals", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const howItWorksSource = readFileSync(homepageComponentPaths.howItWorks, "utf8");

    expect(heroSource).not.toContain('padStart(2, "0")');
    expect(howItWorksSource).not.toContain('padStart(2, "0")');
  });

  it("uses theme-aware hero copy instead of white text in light mode", () => {
    const messages = readLocaleMessages("en-CH");
    const markup = renderWithMessages(HomepageHero, messages);

    expect(markup).toContain("text-zinc-950 dark:text-white");
    expect(markup).toContain("text-zinc-700 dark:text-white/80");
    expect(markup).not.toContain('class="text-white animate-rise-in');
    expect(markup).not.toContain('class="text-white/80 animate-rise-in');
    expect(globalsCssSource).not.toContain(
      "linear-gradient(135deg, #121418 0%, #191b1e 46%, #2a2418 100%)",
    );
  });

  it("keeps the confidence section on a muted surface so the page rhythm still alternates", () => {
    const messages = readLocaleMessages("en-CH");
    const confidenceMarkup = renderWithMessages(ConfidenceBlock, messages);

    expect(confidenceMarkup).toContain("bg-[var(--app-surface-muted)]/55");
  });

  it("routes the three mid-page homepage blocks through one shared feature section wrapper", () => {
    const howItWorksSource = readFileSync(homepageComponentPaths.howItWorks, "utf8");
    const confidenceSource = readFileSync(homepageComponentPaths.confidence, "utf8");
    const useCasesSource = readFileSync(homepageComponentPaths.useCases, "utf8");

    expect(existsSync(marketingFeatureSectionPath)).toBe(true);
    expect(marketingFeatureSectionSource).toContain(
      "export function MarketingFeatureSection",
    );
    expect(marketingFeatureSectionSource).toContain("<SectionHeader");
    expect(marketingFeatureSectionSource).toContain("<SectionGrid");
    expect(marketingFeatureSectionSource).toContain("<MarketingFeatureCard");
    expect(howItWorksSource).toContain("<MarketingFeatureSection");
    expect(confidenceSource).toContain("<MarketingFeatureSection");
    expect(useCasesSource).toContain("<MarketingFeatureSection");
  });

  it("uses distinct light-and-dark-safe icon tones and drops numeric step badges in the shared mid-page sections", () => {
    const messages = readLocaleMessages("en-CH");
    const howItWorksMarkup = renderWithMessages(HowItWorksSteps, messages);
    const confidenceMarkup = renderWithMessages(ConfidenceBlock, messages);
    const useCasesMarkup = renderWithMessages(UseCaseGrid, messages);

    expect(howItWorksMarkup).not.toContain(">01<");
    expect(howItWorksMarkup).toContain("bg-sky-50");
    expect(howItWorksMarkup).toContain("dark:bg-sky-500/20");
    expect(confidenceMarkup).toContain("bg-emerald-50");
    expect(confidenceMarkup).toContain("dark:bg-emerald-500/20");
    expect(useCasesMarkup).toContain("bg-amber-50");
    expect(useCasesMarkup).toContain("dark:bg-amber-500/20");
  });

  it("uses clearer English headings for the three mid-page sections", () => {
    const messages = readLocaleMessages("en-CH");

    expect(getNestedValue(messages, "marketing.homepage.howItWorks.title")).toBe(
      "From your situation to a finished letter",
    );
    expect(getNestedValue(messages, "marketing.homepage.confidence.title")).toBe(
      "You stay in control",
    );
    expect(getNestedValue(messages, "marketing.homepage.useCases.title")).toBe(
      "When Episto can help",
    );
  });

  it("uses direct trust headings across the non-English confidence sections", () => {
    expect(
      getNestedValue(readLocaleMessages("de-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Sie behalten die Kontrolle");
    expect(
      getNestedValue(readLocaleMessages("fr-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Vous gardez la main");
    expect(
      getNestedValue(readLocaleMessages("it-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Mantiene il controllo");
  });

  it("avoids vague use-case section titles in customer-facing locales", () => {
    expect(
      getNestedValue(readLocaleMessages("fr-CH"), "marketing.homepage.useCases.title"),
    ).toBe("Quand Episto peut vous aider");
    expect(
      getNestedValue(readLocaleMessages("it-CH"), "marketing.homepage.useCases.title"),
    ).toBe("Quando Episto può esserLe utile");
  });

  it("uses the primary yellow cta band treatment with enforced dark body contrast", () => {
    expect(homepageSource).not.toContain("text-white/70");
    expect(finalCtaBandSource).toContain("MarketingHeading");
    expect(finalCtaBandSource).toContain("MarketingBody");
    expect(finalCtaBandSource).toContain('tone="accent"');
    expect(finalCtaBandSource).toContain('tone="accentMuted"');
    expect(pricingFromTextSource).toContain("MarketingHeading");
    expect(pricingFromTextSource).toContain("MarketingBody");
    expect(pricingFromTextSource).toContain('tone="accent"');
    expect(pricingFromTextSource).toContain('tone="accentMuted"');
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

  it("renders each reusable homepage section with translated copy", () => {
    const messages = readLocaleMessages("en-CH");
    const componentExpectations: Array<{
      Component: RenderableComponent;
      keys: string[];
    }> = [
      {
        Component: HomepageHero,
        keys: [
          "marketing.homepage.hero.title",
          "marketing.homepage.hero.subtitle",
          "marketing.homepage.hero.secondaryCta",
          "marketing.homepage.hero.proof",
        ],
      },
      {
        Component: TrustStrip,
        keys: [
          "marketing.homepage.trustStrip.postal",
          "marketing.homepage.trustStrip.privacy",
          "marketing.homepage.trustStrip.noAccount",
        ],
      },
      {
        Component: HowItWorksSteps,
        keys: [
          "marketing.homepage.howItWorks.title",
          "marketing.homepage.howItWorks.steps.describe.title",
          "marketing.homepage.howItWorks.steps.review.body",
          "marketing.homepage.howItWorks.steps.send.title",
        ],
      },
      {
        Component: ConfidenceBlock,
        keys: [
          "marketing.homepage.confidence.title",
          "marketing.homepage.confidence.cards.structured.title",
          "marketing.homepage.confidence.cards.review.body",
          "marketing.homepage.confidence.cards.privacy.title",
        ],
      },
      {
        Component: UseCaseGrid,
        keys: [
          "marketing.homepage.useCases.title",
          "marketing.homepage.useCases.cancellation.title",
          "marketing.homepage.useCases.lease.description",
          "marketing.homepage.useCases.authority.description",
        ],
      },
    ];

    for (const { Component, keys } of componentExpectations) {
      const markup = renderWithMessages(Component, messages);

      for (const keyPath of keys) {
        expect(markup).toContain(String(getNestedValue(messages, keyPath)));
      }
    }
  });

  it("renders the homepage with the reusable sections in the expected order", async () => {
    const messages = readLocaleMessages("en-CH");
    const markup = await renderHomePageWithMessages("en-CH", messages);
    const orderedCopy = [
      "marketing.homepage.hero.title",
      "marketing.homepage.trustStrip.postal",
      "marketing.homepage.howItWorks.title",
      "marketing.homepage.confidence.title",
      "marketing.homepage.useCases.title",
      "marketing.ctaTitle",
    ].map((keyPath) => String(getNestedValue(messages, keyPath)));

    let previousIndex = -1;

    for (const copy of orderedCopy) {
      const copyIndex = markup.indexOf(copy);
      expect(copyIndex).toBeGreaterThan(previousIndex);
      previousIndex = copyIndex;
    }
  });

  it("keeps the homepage hero to one supporting paragraph under the title", () => {
    const heroMessages = {
      marketing: {
        homepage: {
          hero: {
            badge: "Built for important letters",
            title: "Your letter, no printer or stamp needed",
            subtitle:
              "Describe what you need. We draft the first version, you review it, and we prepare it for postal dispatch in Switzerland.",
            body: "This older second paragraph should not render anymore.",
            primaryCta: "Write your letter now",
            secondaryCta: "See how it works",
            proof: "No account required",
            steps: {
              describe: "Describe",
              review: "Review",
              send: "Send",
            },
          },
        },
      },
    } satisfies MessageTree;

    const markup = renderWithMessages(HomepageHero, heroMessages);

    expect(markup).toContain(
      String(getNestedValue(heroMessages, "marketing.homepage.hero.subtitle")),
    );
    expect(markup).not.toContain(
      String(getNestedValue(heroMessages, "marketing.homepage.hero.body")),
    );
  });

  it("covers the full new homepage translation surface in every locale", async () => {
    for (const locale of Object.keys(localeMessagePaths) as LocaleKey[]) {
      const messages = readLocaleMessages(locale);

      for (const keyPath of requiredHomepageKeys) {
        expect(
          getNestedValue(messages, keyPath),
          `${locale} is missing ${keyPath}`,
        ).toBeTypeOf("string");
      }

      const markup = await renderHomePageWithMessages(locale, messages);
      expect(markup).toContain(
        String(getNestedValue(messages, "marketing.homepage.hero.title")),
      );
      expect(markup).toContain(
        String(getNestedValue(messages, "marketing.homepage.howItWorks.title")),
      );
      expect(markup).toContain(
        String(getNestedValue(messages, "marketing.homepage.confidence.title")),
      );
      expect(markup).toContain(
        String(getNestedValue(messages, "marketing.homepage.useCases.title")),
      );
    }
  });
});
