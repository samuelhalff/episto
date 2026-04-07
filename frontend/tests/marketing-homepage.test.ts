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

const requiredHomepageKeys = [
  "marketing.homepage.hero.badge",
  "marketing.homepage.hero.title",
  "marketing.homepage.hero.subtitle",
  "marketing.homepage.hero.body",
  "marketing.homepage.hero.primaryCta",
  "marketing.homepage.hero.secondaryCta",
  "marketing.homepage.hero.proof",
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

type RenderableComponent = () => JSX.Element;

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
          "marketing.homepage.hero.body",
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

  it("renders the homepage with the reusable sections in the expected order", () => {
    const messages = readLocaleMessages("en-CH");
    const markup = renderWithMessages(HomePage, messages);
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

  it("covers the full new homepage translation surface in every locale", () => {
    for (const locale of Object.keys(localeMessagePaths) as LocaleKey[]) {
      const messages = readLocaleMessages(locale);

      for (const keyPath of requiredHomepageKeys) {
        expect(
          getNestedValue(messages, keyPath),
          `${locale} is missing ${keyPath}`,
        ).toBeTypeOf("string");
      }

      const markup = renderWithMessages(HomePage, messages);
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
