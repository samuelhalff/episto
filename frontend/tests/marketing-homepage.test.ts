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

  it("replaces the hero's blue cast with shared charcoal-and-amber styling", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("homepage-hero-shell");
    expect(heroSource).toContain("homepage-hero-badge");
    expect(heroSource).toContain('variant="heroSecondary"');
    expect(heroSource).not.toContain("backgroundImage:");
    expect(heroSource).not.toContain("#1e3a5f");
    expect(heroSource).not.toContain("#27466f");
    expect(globalsCssSource).toContain(".homepage-hero-shell");
    expect(globalsCssSource).toContain(".homepage-hero-badge");
    expect(globalsCssSource).toContain(".dark .homepage-hero-badge");
    expect(globalsCssSource).not.toContain(".homepage-hero-secondary");
    expect(primitivesSource).toContain('"heroSecondary"');
    expect(primitivesSource).toContain("border-amber-300/60");
    expect(primitivesSource).toContain("bg-transparent");
    expect(primitivesSource).toContain("text-amber-950");
    expect(primitivesSource).toContain("dark:text-amber-50");
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

  it("keeps the light-theme hero shell airy instead of a diagonal dark wash", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(globalsCssSource).toContain(".homepage-hero-shell");
    expect(globalsCssSource).toContain(
      "linear-gradient(180deg, #fdfbf8 0%, #faf6ef 58%, #f6efe5 100%)",
    );
    expect(globalsCssSource).toContain("rgba(250, 204, 21, 0.08)");
    expect(globalsCssSource).toContain("rgba(245, 158, 11, 0.05)");
    expect(globalsCssSource).toContain("rgba(250, 204, 21, 0.02)");
    expect(globalsCssSource).not.toContain(
      "linear-gradient(135deg, #fcfaf6 0%, #f7f1e8 48%, #e8ddd0 100%)",
    );
    expect(globalsCssSource).not.toContain("rgba(250, 204, 21, 0.14)");
    expect(globalsCssSource).not.toContain("rgba(245, 158, 11, 0.1)");
    expect(globalsCssSource).not.toContain("rgba(250, 204, 21, 0.04)");
    expect(heroSource).toContain("bg-amber-200/16");
    expect(heroSource).toContain("dark:bg-amber-200/30");
    expect(heroSource).not.toContain("rounded-full bg-amber-200/30 blur-3xl");
  });

  it("keeps the light-theme hero chrome flat instead of using heavy badge and button shadows", () => {
    const heroBadgeBlock =
      globalsCssSource.match(/\.homepage-hero-badge\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(primitivesSource).toContain("variant === \"heroSecondary\"");
    expect(primitivesSource).toContain("shadow-none");
    expect(primitivesSource).not.toContain("shadow-[0_18px_44px_rgba(0,0,0,0.16)]");
    expect(heroBadgeBlock).toContain("box-shadow: none;");
    expect(heroBadgeBlock).not.toContain("box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);");
    expect(heroBadgeBlock).not.toContain("backdrop-filter:");
    expect(heroBadgeBlock).not.toContain("-webkit-backdrop-filter:");
  });

  it("keeps the light-theme mockup shadow soft so the hero transition stays clean", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const mockupCardBlock =
      globalsCssSource.match(/\.homepage-hero-mockup-card\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(heroSource).toContain("homepage-hero-mockup-card");
    expect(heroSource).not.toContain("shadow-[0_32px_90px_rgba(0,0,0,0.28)]");
    expect(globalsCssSource).toContain(".homepage-hero-mockup-card");
    expect(globalsCssSource).toContain(".dark .homepage-hero-mockup-card");
    expect(mockupCardBlock).toContain("box-shadow: 0 18px 48px rgba(120, 53, 15, 0.08);");
    expect(mockupCardBlock).not.toContain("box-shadow: 0 26px 70px rgba(120, 53, 15, 0.14);");
    expect(globalsCssSource).toContain("box-shadow: 0 32px 90px rgba(0, 0, 0, 0.28);");
  });

  it("keeps the hero step-pill stack compact", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain('className="space-y-3"');
    expect(heroSource).not.toContain('className="space-y-3 py-3 sm:py-4"');
  });

  it("disables the light-theme hero grid so it cannot cast dark bands", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("opacity-0 dark:opacity-40");
  });

  it("keeps hero preview labels in a hero-owned translation namespace", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("homepage.hero.steps");
    expect(heroSource).not.toContain("homepage.howItWorks.steps");
  });

  it("keeps the hero paper mockup skeleton placeholders", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("paper-noise");
    expect(heroSource).toContain("mt-4 h-3 w-28 rounded-full bg-zinc-300/75");
    expect(heroSource).toContain("mt-4 space-y-2");
    expect(heroSource).toContain("w-full rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[88%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[82%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[75%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-24 rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("mt-2 h-2.5 w-16 rounded-full bg-zinc-400/70");
  });

  it("avoids thin ruled separators inside the hero paper mockup", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("paper-noise");
    expect(heroSource).not.toContain("mt-4 h-px w-full bg-zinc-300/70");
    expect(heroSource).not.toContain("mt-8 h-px w-24 bg-zinc-400/70");
  });

  it("uses a paper texture instead of ruled lines in the hero paper mockup background", () => {
    expect(globalsCssSource).toContain(".paper-noise");
    expect(globalsCssSource).toContain(".dark .paper-noise");
    expect(globalsCssSource).not.toContain("rgba(215, 190, 150, 0.18) 31px");
    expect(globalsCssSource).not.toContain("rgba(110, 118, 129, 0.12) 31px");
  });

  it("avoids vertical gradient banding in the hero paper mockup background", () => {
    const paperNoiseBlock =
      globalsCssSource.match(/\.paper-noise\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    const darkPaperNoiseBlock =
      globalsCssSource.match(/\.dark \.paper-noise\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(paperNoiseBlock).toContain("background-image:");
    expect(darkPaperNoiseBlock).toContain("background-image:");
    expect(paperNoiseBlock).not.toContain("linear-gradient(");
    expect(darkPaperNoiseBlock).not.toContain("linear-gradient(");
  });

  it("uses a shared macOS-style red yellow green window dots component in the hero paper mockup", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const windowDotsSource = existsSync(homepageComponentPaths.windowDots)
      ? readFileSync(homepageComponentPaths.windowDots, "utf8")
      : "";

    const redIndex = windowDotsSource.indexOf("#FF5F57");
    const yellowIndex = windowDotsSource.indexOf("#FFBD2E");
    const greenIndex = windowDotsSource.indexOf("#28C840");

    expect(heroSource).toContain(
      'import { MarketingWindowDots } from "./MarketingWindowDots"',
    );
    expect(heroSource).toContain("<MarketingWindowDots />");
    expect(heroSource).not.toContain("bg-emerald-400/80");
    expect(heroSource).not.toContain("bg-amber-400/80");
    expect(heroSource).not.toContain("bg-rose-400/80");
    expect(yellowIndex).toBeGreaterThan(-1);
    expect(redIndex).toBeGreaterThan(-1);
    expect(greenIndex).toBeGreaterThan(-1);
    expect(redIndex).toBeLessThan(yellowIndex);
    expect(yellowIndex).toBeLessThan(greenIndex);
  });

  it("stacks the trust strip as full-width rows on mobile while preserving the desktop wrap", () => {
    const trustStripSource = readFileSync(homepageComponentPaths.trustStrip, "utf8");

    expect(trustStripSource).toContain(
      'section className="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)]/75 px-4 py-6 sm:px-6 sm:py-7"',
    );
    expect(trustStripSource).toContain(
      "flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center",
    );
    expect(trustStripSource).toContain("flex w-full items-center gap-3 rounded-full");
    expect(trustStripSource).toContain("sm:w-auto");
  });

  it("uses the shared amber icon token for subtle trust-strip contrast", () => {
    const trustStripSource = readFileSync(homepageComponentPaths.trustStrip, "utf8");

    expect(trustStripSource).toContain('className="h-9 w-9 [&>svg]:size-4"');
    expect(trustStripSource).toContain('tone="amber"');
    expect(marketingIconTokenSource).toContain(
      "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
    );
    expect(trustStripSource).not.toContain("<MarketingInfoPill");
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
      "You stay in control at every step",
    );
    expect(getNestedValue(messages, "marketing.homepage.useCases.title")).toBe(
      "When Episto can help",
    );
  });

  it("uses direct trust headings across the non-English confidence sections", () => {
    expect(
      getNestedValue(readLocaleMessages("de-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Sie behalten in jedem Schritt die Kontrolle");
    expect(
      getNestedValue(readLocaleMessages("fr-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Vous gardez la main à chaque étape");
    expect(
      getNestedValue(readLocaleMessages("it-CH"), "marketing.homepage.confidence.title"),
    ).toBe("Mantiene il controllo in ogni passaggio");
  });

  it("avoids vague use-case section titles in customer-facing locales", () => {
    expect(
      getNestedValue(readLocaleMessages("fr-CH"), "marketing.homepage.useCases.title"),
    ).toBe("Quand Episto peut vous aider");
    expect(
      getNestedValue(readLocaleMessages("it-CH"), "marketing.homepage.useCases.title"),
    ).toBe("Quando Episto può aiutarLa");
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
