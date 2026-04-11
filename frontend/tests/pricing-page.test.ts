import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

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

vi.mock("../src/hooks/use-pricing", () => ({
  usePricing: () => pricingState.value,
}));

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
const pricingPageClientSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingPageClient.tsx"),
  "utf8",
);

globalThis.React = React;

import {
  PricingBreakdownSection,
  PricingHeroPanel,
} from "../src/components/marketing/PricingPageClient";

const localeMessages = {
  "de-CH": deCH,
  "en-CH": enCH,
  "fr-CH": frCH,
  "it-CH": itCH,
} as const;

const requiredPricingKeys = [
  "totalsSharedSourceNote",
  "compositionTitle",
  "compositionBody",
  "serviceStandardFeeLabel",
  "serviceRegisteredFeeLabel",
  "referenceAssumptionsTitle",
  "referenceAssumptionsBody",
  "assumptionCountryLabel",
  "assumptionEnvelopeLabel",
  "assumptionWindowLabel",
  "assumptionDuplexLabel",
  "duplexFalseValue",
  "assumptionAttachmentLabel",
  "attachmentNoneValue",
  "assumptionStandardPostageLabel",
  "assumptionRegisteredPostageLabel",
  "syncStatusTitle",
  "syncFreshLabel",
  "syncStaleLabel",
  "syncSourceLabel",
  "syncLastSyncedLabel",
  "syncFreshBody",
  "syncStaleBody",
  "matrixExamplesTitle",
  "matrixExamplesBody",
  "standardExamplesTitle",
  "registeredExamplesTitle",
  "pagesColumnLabel",
  "providerQuoteColumnLabel",
  "totalColumnLabel",
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
      syncStatusTitle: "Stored pricing status",
      syncFreshLabel: "Up to date",
      syncStaleLabel: "Needs refresh",
      syncSourceLabel: "Source",
      syncLastSyncedLabel: "Last synced",
      totalsSharedSourceNote:
        "These public totals use the same stored provider pricing source shown in the app.",
      compositionTitle: "What makes up the price",
      compositionBody:
        "Episto service plus the stored provider reference totals for standard and registered dispatch.",
      serviceStandardFeeLabel: "Episto service (standard)",
      serviceRegisteredFeeLabel: "Episto service (registered)",
      referenceAssumptionsTitle: "Reference assumptions",
      referenceAssumptionsBody:
        "These public examples cover Swiss domestic letters with the fixed provider-side settings the stored matrix currently supports.",
      assumptionCountryLabel: "Destination",
      assumptionEnvelopeLabel: "Envelope",
      assumptionWindowLabel: "Window",
      assumptionDuplexLabel: "Printing",
      duplexFalseValue: "Simplex only",
      assumptionAttachmentLabel: "Attachment mode",
      attachmentNoneValue: "No attachment",
      assumptionStandardPostageLabel: "Standard postage mapping",
      assumptionRegisteredPostageLabel: "Registered postage mapping",
      syncFreshBody:
        "These prices come from the latest stored provider sync used by Episto.",
      syncStaleBody:
        "These prices come from the last successful provider sync and may be outdated until the next refresh.",
      matrixExamplesTitle: "Matrix-backed page-count examples",
      matrixExamplesBody:
        "These example totals come from the stored Swiss domestic no-attachment matrix only.",
      standardExamplesTitle: "Standard examples",
      registeredExamplesTitle: "Registered examples",
      pagesColumnLabel: "Pages",
      providerQuoteColumnLabel: "Provider quote",
      totalColumnLabel: "Episto total",
    },
  } satisfies Record<string, unknown>;
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
  const standardProviderQuotedCents = 155;
  const standardFivePageProviderQuotedCents = 215;
  const registeredProviderQuotedCents = 578;
  const registeredFivePageProviderQuotedCents = 638;
  const standardTotalCents = standardProviderQuotedCents + standardMarkupCents;
  const standardFivePageTotalCents =
    standardFivePageProviderQuotedCents + standardMarkupCents;
  const registeredTotalCents = registeredProviderQuotedCents + registeredMarkupCents;
  const registeredFivePageTotalCents =
    registeredFivePageProviderQuotedCents + registeredMarkupCents;

  return {
    standard: {
      totalCents: standardTotalCents,
      displayPrice: formatCHF(standardTotalCents),
      currency: "CHF",
      providerQuotedCents: standardProviderQuotedCents,
      providerQuotedDisplayPrice: formatCHF(standardProviderQuotedCents),
      swissMailMarkupCents: standardMarkupCents,
      swissMailMarkupDisplayPrice: formatCHF(standardMarkupCents),
    },
    registered: {
      totalCents: registeredTotalCents,
      displayPrice: formatCHF(registeredTotalCents),
      currency: "CHF",
      providerQuotedCents: registeredProviderQuotedCents,
      providerQuotedDisplayPrice: formatCHF(registeredProviderQuotedCents),
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
        standard: [
          {
            pageCount: 1,
            providerQuotedCents: standardProviderQuotedCents,
            providerQuotedDisplayPrice: formatCHF(standardProviderQuotedCents),
            totalCents: standardTotalCents,
            displayPrice: formatCHF(standardTotalCents),
            currency: "CHF",
          },
          {
            pageCount: 5,
            providerQuotedCents: standardFivePageProviderQuotedCents,
            providerQuotedDisplayPrice: formatCHF(standardFivePageProviderQuotedCents),
            totalCents: standardFivePageTotalCents,
            displayPrice: formatCHF(standardFivePageTotalCents),
            currency: "CHF",
          },
        ],
        registered: [
          {
            pageCount: 1,
            providerQuotedCents: registeredProviderQuotedCents,
            providerQuotedDisplayPrice: formatCHF(registeredProviderQuotedCents),
            totalCents: registeredTotalCents,
            displayPrice: formatCHF(registeredTotalCents),
            currency: "CHF",
          },
          {
            pageCount: 5,
            providerQuotedCents: registeredFivePageProviderQuotedCents,
            providerQuotedDisplayPrice: formatCHF(registeredFivePageProviderQuotedCents),
            totalCents: registeredFivePageTotalCents,
            displayPrice: formatCHF(registeredFivePageTotalCents),
            currency: "CHF",
          },
        ],
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

  it("renders a sync status block with stale pricing metadata and matrix-backed examples", () => {
    pricingState.value = {
      data: createPricingData({ freshness: "stale" }),
      isLoading: false,
      isError: false,
    };

    const markup = renderPricingSections();

    expect(markup).toContain("Stored pricing status");
    expect(markup).toContain("Needs refresh");
    expect(markup).toContain("ePost active rate matrix");
    expect(markup).toContain("Last synced");
    expect(markup).toContain("Matrix-backed page-count examples");
    expect(markup).toContain("CHF 4.95");
    expect(markup).toContain("CHF 9.78");
  });

  it("shows separate Episto service rows when standard and registered markups differ", () => {
    pricingState.value = {
      data: createPricingData({
        standardMarkupCents: 340,
        registeredMarkupCents: 410,
      }),
      isLoading: false,
      isError: false,
    };

    const markup = renderPricingSections();

    expect(markup).toContain("Episto service (standard)");
    expect(markup).toContain("Episto service (registered)");
    expect(markup).toContain("CHF 3.40");
    expect(markup).toContain("CHF 4.10");
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
    expect(markup).not.toContain(enCH.pricing.summaryCardTitle);
    expect(markup).not.toContain(enCH.pricing.compositionTitle);
    expect(markup).not.toContain(enCH.pricing.comparisonTitle);
  });
});

describe("pricing page source contract", () => {
  it("drops the legacy unit-input cards in favor of sync and matrix-backed sections", () => {
    expect(pricingPageClientSource).toContain('t("syncStatusTitle")');
    expect(pricingPageClientSource).toContain('t("matrixExamplesTitle")');
    expect(pricingPageClientSource).not.toContain('t("serviceCardTitle")');
    expect(pricingPageClientSource).not.toContain('t("providerCardTitle")');
    expect(pricingPageClientSource).not.toContain('t("referenceCardTitle")');
  });
});

describe("pricing page locales", () => {
  for (const [localeName, localeData] of Object.entries(localeMessages)) {
    it(`${localeName} defines the sync and matrix pricing copy`, () => {
      for (const key of requiredPricingKeys) {
        expect(
          getNestedString(localeData as Record<string, unknown>, ["pricing", key]),
        ).toBeDefined();
      }
    });
  }
});
