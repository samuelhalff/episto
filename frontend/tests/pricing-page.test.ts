import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as PricingHooks from "../src/hooks/use-pricing";

import enCH from "../src/messages/en-CH.json";

const { i18nState, pricingState } = vi.hoisted(() => ({
  i18nState: { messages: {} as Record<string, unknown> },
  pricingState: {
    value: {
      data: undefined,
      isLoading: false,
      isError: false,
    } as {
      data?: Record<string, unknown>;
      isLoading: boolean;
      isError: boolean;
    },
  },
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
    useLocale() {
      return "en-CH";
    },
  };
});

vi.mock("../src/hooks/use-pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof PricingHooks>();

  return {
    ...actual,
    usePricing: () => pricingState.value,
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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJsonFromHead(relativePath: string) {
  return JSON.parse(
    execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
    }),
  ) as Record<string, unknown>;
}

const pricingHeroSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingHero.tsx"),
  "utf8",
);
const pricingTiersSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingTiers.tsx"),
  "utf8",
);
const pricingPageClientSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingPageClient.tsx"),
  "utf8",
);
const pricingPageRouteSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/pricing/page.tsx"),
  "utf8",
);
const pricingFaqSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingFaq.tsx"),
  "utf8",
);
const pricingSharedSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/pricing-shared.tsx"),
  "utf8",
);
const pricingSimulatorSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingSimulator.tsx"),
  "utf8",
);

globalThis.React = React;

import {
  PricingBreakdownSection,
  PricingHeroPanel,
} from "../src/components/marketing/PricingPageClient";

const localeMessages = {
  "de-CH": readJsonFromHead("frontend/src/messages/de-CH.json"),
  "en-CH": readJsonFromHead("frontend/src/messages/en-CH.json"),
  "fr-CH": readJsonFromHead("frontend/src/messages/fr-CH.json"),
  "it-CH": readJsonFromHead("frontend/src/messages/it-CH.json"),
} as const;

const expectedSeoPricingDescriptions = {
  "de-CH":
    "Transparente Preise für Standard- und Einschreiben-Briefe, mit einem Preisrechner und dem genauen Total vor der Zahlung.",
  "en-CH":
    "Transparent pricing for standard and registered letters, with a live simulator and the exact total before payment.",
  "fr-CH":
    "Tarifs transparents pour les lettres standard et recommandées, avec un simulateur et le total exact avant le paiement.",
  "it-CH":
    "Prezzi trasparenti per lettere standard e raccomandate, con un simulatore e il totale esatto prima del pagamento.",
} as const;

const expectedMarketingPricingNotes = {
  "de-CH":
    "Basierend auf einem 1-seitigen Brief. Der genaue Total erscheint vor der Zahlung.",
  "en-CH": "Based on a 1-page letter. Exact total before payment.",
  "fr-CH": "Basé sur une lettre d’une page. Le total exact apparaît avant le paiement.",
  "it-CH":
    "Basato su una lettera di una pagina. Il totale esatto appare prima del pagamento.",
} as const;

const expectedMarketingPricingNotesFallback = {
  "de-CH": "Der genaue Total erscheint vor der Zahlung.",
  "en-CH": "Exact total shown before payment.",
  "fr-CH": "Le total exact apparaît avant le paiement.",
  "it-CH": "Il totale esatto appare prima del pagamento.",
} as const;

const requiredPricingKeys = [
  "summaryCardTitle",
  "standardOptionTitle",
  "registeredOptionTitle",
  "priceCaption",
  "standardAdditionalPageLabel",
  "registeredAdditionalPageLabel",
  "simulatorTitle",
  "letterTypeLabel",
  "pagesLabel",
  "increasePagesLabel",
  "decreasePagesLabel",
  "pageSingular",
  "pagePlural",
  "pageLimitNote",
  "includedCardTitle",
  "excludedCardTitle",
  "faqTitle",
  "faqMoreTitle",
  "faqMoreBody",
  "faqMoreCta",
] as const;

const removedPricingKeys = [
  "heroPanelBody",
  "pricingTableTitle",
  "summaryCardBody",
  "priceChangeListTitle",
  "registeredUpgradeLabel",
  "standardLongerLetterLabel",
  "registeredLongerLetterLabel",
  "checkoutTruth",
  "includedCardEyebrow",
  "includedCardBody",
  "excludedCardEyebrow",
  "excludedCardBody",
  "faqEyebrow",
  "faqBody",
  "faq1q",
  "faq1a",
  "faq2q",
  "faq2a",
  "faq3q",
  "faq3a",
  "faq4q",
  "faq4a",
  "comparisonTitle",
  "comparisonBody",
] as const;

function getNestedString(
  source: Record<string, unknown>,
  pathSegments: readonly string[],
): string | undefined {
  let current: unknown = source;

  for (const segment of pathSegments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function formatCHF(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function createPricingMessages() {
  return {
    ...enCH,
    pricing: {
      ...enCH.pricing,
      heroPanelBody: "REMOVE ME HERO BODY",
      pricingTableTitle: "REMOVE ME SUMMARY EYEBROW",
      summaryCardTitle: "Choose your delivery",
      summaryCardBody: "REMOVE ME SUMMARY BODY",
      standardOptionTitle: "Standard",
      registeredOptionTitle: "Registered",
      priceCaption: "1-page letter",
      priceChangeListTitle: "REMOVE ME PRICE CHANGE TITLE",
      standardAdditionalPageLabel: "Each additional page",
      registeredAdditionalPageLabel: "Each additional page",
      simulatorTitle: "Pricing simulator",
      letterTypeLabel: "Letter type",
      pagesLabel: "Pages",
      increasePagesLabel: "Increase pages",
      decreasePagesLabel: "Decrease pages",
      pageSingular: "page",
      pagePlural: "pages",
      pageLimitNote: "Maximum {maxPages} pages",
      standardLongerLetterLabel: "REMOVE ME STANDARD RANGE LABEL",
      registeredLongerLetterLabel: "REMOVE ME REGISTERED RANGE LABEL",
      includedCardEyebrow: "REMOVE ME INCLUDED EYEBROW",
      includedCardTitle: "What's included",
      includedCardBody: "REMOVE ME INCLUDED BODY",
      excludedCardEyebrow: "REMOVE ME EXCLUDED EYEBROW",
      excludedCardTitle: "What's not included",
      excludedCardBody: "REMOVE ME EXCLUDED BODY",
      excludedTranslation: "Translation or localisation review",
      faqEyebrow: "REMOVE ME FAQ EYEBROW",
      faqTitle: "Common questions",
      faqBody: "REMOVE ME FAQ BODY",
      faq1a:
        "Only after the postal provider accepts the letter for dispatch. If the submission is rejected before that, you are not charged.",
      faq2a:
        "Yes, if the problem was caused by our service before or during dispatch submission. Once Swiss Post has accepted the letter, there is no refund for a change of mind or for postal issues after handoff. Any approved refund is returned to the original payment method.",
      faq3a:
        "The price covers one letter: drafting support, final PDF creation, printing, dispatch submission handling, and payment processing. Pricing is per letter, and each order is charged separately.",
      faq4a: "Yes. The price shown before payment is the full amount in CHF you approve.",
      checkoutTruth: "REMOVE ME CHECKOUT BODY",
    },
  } satisfies Record<string, unknown>;
}

function createPageCountExamples(
  providerQuotedCentsByPage: number[],
  markupCents: number,
) {
  return providerQuotedCentsByPage.map((providerQuotedCents, index) => {
    const totalCents = providerQuotedCents + markupCents;

    return {
      pageCount: index + 1,
      providerQuotedCents,
      providerQuotedDisplayPrice: formatCHF(providerQuotedCents),
      totalCents,
      displayPrice: formatCHF(totalCents),
      currency: "CHF",
    };
  });
}

function createPricingData({
  freshness = "fresh",
  standardMarkupCents = 340,
  registeredMarkupCents = 340,
}: {
  freshness?: "fresh" | "stale";
  standardMarkupCents?: number;
  registeredMarkupCents?: number;
} = {}) {
  const standardExamples = createPageCountExamples(
    [155, 170, 185, 200, 215],
    standardMarkupCents,
  );
  const registeredExamples = createPageCountExamples(
    [578, 593, 608, 623, 638],
    registeredMarkupCents,
  );
  const standardTotalCents = standardExamples[0]?.totalCents ?? 0;
  const registeredTotalCents = registeredExamples[0]?.totalCents ?? 0;

  return {
    standard: {
      totalCents: standardTotalCents,
      displayPrice: formatCHF(standardTotalCents),
      currency: "CHF",
      providerQuotedCents: standardExamples[0]?.providerQuotedCents ?? 0,
      providerQuotedDisplayPrice:
        standardExamples[0]?.providerQuotedDisplayPrice ?? formatCHF(0),
      swissMailMarkupCents: standardMarkupCents,
      swissMailMarkupDisplayPrice: formatCHF(standardMarkupCents),
    },
    registered: {
      totalCents: registeredTotalCents,
      displayPrice: formatCHF(registeredTotalCents),
      currency: "CHF",
      providerQuotedCents: registeredExamples[0]?.providerQuotedCents ?? 0,
      providerQuotedDisplayPrice:
        registeredExamples[0]?.providerQuotedDisplayPrice ?? formatCHF(0),
      swissMailMarkupCents: registeredMarkupCents,
      swissMailMarkupDisplayPrice: formatCHF(registeredMarkupCents),
    },
    registeredSurchargeCents: registeredTotalCents - standardTotalCents,
    registeredSurchargeDisplayPrice: formatCHF(registeredTotalCents - standardTotalCents),
    sync: {
      sourceLabel: "ePost active rate matrix",
      lastSyncedAt: "2026-04-07T06:00:00.000Z",
      freshness,
    },
    providerBreakdown: {
      providerName: "ePost",
      note: "Public pricing examples come from the active stored provider rate matrix.",
      sourceUrl: "https://www.epost.example/pricing",
      verifiedDate: "2026-04-07",
      referenceScenario: {
        shippingCountry: "CH",
        envelopeSize: "C5",
        windowLocation: "RIGHT",
        duplex: false,
        attachmentMode: "none",
        standardPostage: "A_POST",
        registeredPostage: "REGISTERED",
      },
      pageCountExamples: {
        standard: standardExamples,
        registered: registeredExamples,
      },
      pricesExcludeVat: true,
      currency: "CHF",
    },
  };
}

function renderPricingSections() {
  return renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(PricingHeroPanel),
      React.createElement(PricingBreakdownSection),
    ),
  );
}

describe("pricing page presentation", () => {
  beforeEach(() => {
    i18nState.messages = createPricingMessages();
    pricingState.value = {
      data: createPricingData(),
      isLoading: false,
      isError: false,
    };
  });

  it("renders minimal pricing cards with direct per-page increments and no filler copy", () => {
    const markup = renderPricingSections();
    const additionalPageMatches = markup.match(/Each additional page/g) ?? [];
    const incrementMatches = markup.match(/\+CHF 0\.15/g) ?? [];

    expect(markup).toContain("Choose your delivery");
    expect(markup).toContain("Standard");
    expect(markup).toContain("Registered");
    expect(markup).toContain("1-page letter");
    expect(additionalPageMatches).toHaveLength(3);
    expect(markup).toContain("CHF 4.95");
    expect(markup).toContain("CHF 9.18");
    expect(incrementMatches).toHaveLength(3);
    expect(markup).toContain("Maximum 5 pages");
    expect(markup).not.toContain("Registered delivery");
    expect(markup).not.toContain("+CHF 4.23");
    expect(markup).toContain("What&#x27;s included");
    expect(markup).toContain("What&#x27;s not included");
    expect(markup).toContain("Common questions");
    expect(markup).not.toContain("REMOVE ME HERO BODY");
    expect(markup).not.toContain("REMOVE ME SUMMARY EYEBROW");
    expect(markup).not.toContain("REMOVE ME SUMMARY BODY");
    expect(markup).not.toContain("REMOVE ME PRICE CHANGE TITLE");
    expect(markup).not.toContain("REMOVE ME STANDARD RANGE LABEL");
    expect(markup).not.toContain("REMOVE ME REGISTERED RANGE LABEL");
    expect(markup).not.toContain("REMOVE ME INCLUDED EYEBROW");
    expect(markup).not.toContain("REMOVE ME INCLUDED BODY");
    expect(markup).not.toContain("REMOVE ME EXCLUDED EYEBROW");
    expect(markup).not.toContain("REMOVE ME EXCLUDED BODY");
    expect(markup).not.toContain("REMOVE ME FAQ EYEBROW");
    expect(markup).not.toContain("REMOVE ME FAQ BODY");
    expect(markup).not.toContain("REMOVE ME CHECKOUT BODY");
  });

  it("renders a pricing simulator instead of the old examples table", () => {
    const markup = renderPricingSections();

    expect(markup).toContain("Pricing simulator");
    expect(markup).toContain("Standard · 1 page");
    expect(markup).toContain("Each additional page");
    expect(markup).toContain("Maximum 5 pages");
    expect(markup).not.toContain("Price examples by page count");
    expect(markup).not.toContain("<table");
  });

  it("shows the pricing unavailable body only once and hides price-bearing sections when pricing is missing", () => {
    pricingState.value = {
      data: undefined,
      isLoading: false,
      isError: true,
    };

    const markup = renderPricingSections();
    const matchCount =
      markup.match(
        new RegExp(
          enCH.pricing.pricingUnavailableBody.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g",
        ),
      )?.length ?? 0;

    expect(matchCount).toBe(1);
    expect(markup).not.toContain(enCH.pricing.priceUnavailable);
    expect(markup).not.toContain("Choose your delivery");
    expect(markup).not.toContain("Pricing simulator");
  });

  it("renders pricing FAQs from the shared help namespace and links to the full help page", () => {
    const markup = renderPricingSections();

    expect(markup).toContain(enCH.help.faq5q);
    expect(markup).toContain(enCH.help.faq5a);
    expect(markup).toContain(enCH.help.faq7q);
    expect(markup).toContain(enCH.help.faq8q);
    expect(markup).toContain(enCH.pricing.faqMoreTitle);
    expect(markup).toContain(enCH.pricing.faqMoreBody);
    expect(markup).toContain(enCH.pricing.faqMoreCta);
    expect(markup).toContain('href="/help"');
  });
});

describe("pricing page source contract", () => {
  it("removes filler pricing copy and keeps pricing rows on a shared baseline-aligned layout", () => {
    expect(pricingPageClientSource).not.toContain("showComparison");
    expect(pricingPageRouteSource).not.toContain("panel={<PricingHeroPanel />}");
    expect(pricingHeroSource).not.toContain('t("heroPanelBody")');
    expect(pricingHeroSource).toContain("return null");
    expect(pricingTiersSource).toContain('t("standardOptionTitle")');
    expect(pricingTiersSource).toContain('t("registeredOptionTitle")');
    expect(pricingTiersSource).toContain('t("priceCaption")');
    expect(pricingTiersSource).toContain('t("standardAdditionalPageLabel")');
    expect(pricingTiersSource).toContain('t("registeredAdditionalPageLabel")');
    expect(pricingTiersSource).toContain("PricingSimulator");
    // Tariff rows use tabular figures + hairline rules instead of the old soft card.
    expect(pricingTiersSource).toContain("numeral");
    expect(pricingTiersSource).toContain("hairline");
    expect(pricingTiersSource).not.toContain('tone="soft"');
    expect(pricingTiersSource).not.toContain('tone="contrast"');
    expect(pricingTiersSource).not.toContain("registeredSurchargeDisplayPrice");
    expect(pricingSimulatorSource).toContain("PricingValueRow");
    expect(pricingSimulatorSource).toContain('t("pageLimitNote",');
    expect(pricingSimulatorSource).toContain('role="radiogroup"');
    expect(pricingSimulatorSource).toContain('role="radio"');
    expect(pricingSimulatorSource).not.toContain("ToggleGroup");
    expect(pricingSharedSource).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(pricingSharedSource).toContain("items-baseline");
    expect(pricingSharedSource).not.toContain(
      'className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-2xl px-4 py-3"',
    );
    expect(pricingSimulatorSource).not.toContain(
      'className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4"',
    );
    expect(pricingPageClientSource).toContain('useTranslations("help")');
    expect(pricingPageClientSource).toContain("buildPricingFaqs");
    expect(pricingPageClientSource).not.toContain('t("faq1q")');
    expect(pricingPageClientSource).not.toContain('t("faq2q")');
    expect(pricingPageClientSource).not.toContain('t("faq3q")');
    expect(pricingPageClientSource).not.toContain('t("faq4q")');
    expect(pricingTiersSource).not.toContain('t("pricingTableTitle")');
    expect(pricingTiersSource).not.toContain('t("summaryCardBody")');
    expect(pricingTiersSource).not.toContain('t("addOnsTitle")');
    expect(pricingTiersSource).not.toContain('t("priceChangeListTitle")');
    expect(pricingTiersSource).not.toContain('t("standardLongerLetterLabel")');
    expect(pricingTiersSource).not.toContain('t("registeredLongerLetterLabel")');
    expect(pricingTiersSource).not.toContain('t("registeredUpgradeLabel")');
    expect(pricingTiersSource).not.toContain('t("pricingExamplesTitle")');
    expect(pricingTiersSource).not.toContain('t("pricingExamplesBody")');
    expect(pricingTiersSource).not.toContain('t("standardExamplesTitle")');
    expect(pricingTiersSource).not.toContain('t("registeredExamplesTitle")');
    expect(pricingTiersSource).not.toContain('t("pagesColumnLabel")');
    expect(pricingTiersSource).not.toContain('t("exampleTotalColumnLabel")');
    expect(pricingTiersSource).not.toContain("overflow-x-auto");
    expect(pricingTiersSource).not.toContain('t("checkoutTruth")');
    expect(pricingTiersSource).not.toContain('t("syncStatusTitle")');
    expect(pricingTiersSource).not.toContain('t("serviceStandardFeeLabel")');
    expect(pricingTiersSource).not.toContain('t("providerStandardQuoteLabel")');
    expect(pricingFaqSource).not.toContain("SectionLabel");
    expect(pricingFaqSource).not.toContain('t("includedCardEyebrow")');
    expect(pricingFaqSource).not.toContain('t("includedCardBody")');
    expect(pricingFaqSource).not.toContain('t("excludedCardEyebrow")');
    expect(pricingFaqSource).not.toContain('t("excludedCardBody")');
    expect(pricingFaqSource).not.toContain('t("faqEyebrow")');
    expect(pricingFaqSource).not.toContain('t("faqBody")');
    expect(pricingFaqSource).not.toContain("overflow-x-auto");
    expect(pricingFaqSource).toContain('t("faqMoreTitle")');
    expect(pricingFaqSource).toContain('t("faqMoreBody")');
    expect(pricingFaqSource).toContain('t("faqMoreCta")');
    expect(pricingFaqSource).toContain('href="/help"');
    expect(pricingFaqSource).toContain('variant="heroSecondary"');
    expect(pricingFaqSource).toContain("MarketingFaqItem");
    expect(pricingFaqSource).toContain("key={faq.id}");
    expect(pricingFaqSource).not.toContain("key={faq.question}");
    // Included/excluded is a hairline ledger; FAQ uses native disclosure rows.
    expect(pricingFaqSource).toContain("<details");
    expect(pricingFaqSource).toContain("group-open:rotate-180");
    expect(pricingFaqSource).toContain("hairline");
    expect(pricingFaqSource).not.toContain("MarketingCard");
    expect(pricingFaqSource).not.toContain("text-emerald-700 dark:text-emerald-300");
    expect(pricingFaqSource).not.toContain("text-red-700 dark:text-red-300");
    expect(pricingFaqSource).not.toContain("ShieldQuestion");
    expect(pricingSharedSource).toContain(
      "flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3",
    );
    expect(pricingSharedSource).toContain("inline-flex h-6 w-6 shrink-0");
    expect(pricingSharedSource).toContain("bg-emerald-100 text-emerald-700");
    expect(pricingSharedSource).toContain("bg-red-100 text-red-700");
    expect(pricingSharedSource).toContain("dark:bg-emerald-950 dark:text-emerald-200");
    expect(pricingSharedSource).toContain("dark:bg-red-950 dark:text-red-200");
    expect(pricingSharedSource).not.toContain(
      "dark:bg-emerald-400/15 dark:text-emerald-300",
    );
    expect(pricingSharedSource).not.toContain("dark:bg-red-400/15 dark:text-red-300");
  });
});

describe("pricing page locales", () => {
  for (const [localeName, localeData] of Object.entries(localeMessages)) {
    it(`${localeName} defines the approved minimal pricing keys`, () => {
      for (const key of requiredPricingKeys) {
        expect(
          getNestedString(localeData as Record<string, unknown>, ["pricing", key]),
        ).toBeDefined();
      }

      for (const key of removedPricingKeys) {
        expect(
          getNestedString(localeData as Record<string, unknown>, ["pricing", key]),
        ).toBeUndefined();
      }

      expect(
        getNestedString(localeData as Record<string, unknown>, [
          "seo",
          "pricing",
          "description",
        ]),
      ).toBe(expectedSeoPricingDescriptions[localeName as keyof typeof localeMessages]);
      expect(
        getNestedString(localeData as Record<string, unknown>, [
          "marketing",
          "pricingNotes",
        ]),
      ).toBe(expectedMarketingPricingNotes[localeName as keyof typeof localeMessages]);
      expect(
        getNestedString(localeData as Record<string, unknown>, [
          "marketing",
          "pricingNotesFallback",
        ]),
      ).toBe(
        expectedMarketingPricingNotesFallback[localeName as keyof typeof localeMessages],
      );
    });
  }
});
