import {
  PublicPricingResponseSchema,
  type PostalPostage,
  type PublicPricingReferenceScenario,
} from "@swiss-mail/shared";

import { env } from "../../shared/config/index.js";

/**
 * Public pricing service — exposes an honest reference scenario for marketing.
 *
 * Exact checkout pricing still comes from the draft-specific provider quote.
 * Public surfaces use one documented reference scenario so the amounts and
 * per-page breakdown remain explainable.
 *
 * Official ePost inputs verified on 2026-04-03:
 * - https://www.epost.ch/en/business-customers/send
 * - https://www.epost.ch/en/business-customers/digital-letter
 */

export interface PriceBreakdown {
  baseCents: number;
  deliverySurchargeCents: number;
  pageSurchargeCents: number;
  attachmentSurchargeCents: number;
  totalCents: number;
}

export type DeliveryType = "standard" | "registered";

const VERIFIED_DATE = "2026-04-03";
const EPOST_SOURCE_URL = "https://www.epost.ch/en/business-customers/digital-letter";

const EPOST_PUBLIC_RATES = {
  perPrintedPageCents: 5,
  perA4SheetCents: 10,
  envelopeC5Cents: 30,
  envelopeC4Cents: 60,
  postageCents: {
    A_POST: 110,
    B_POST: 92,
    B_POST_LARGEVOLUME: 60,
    A_PLUS: 267,
    REGISTERED: 533,
  },
} as const satisfies {
  perPrintedPageCents: number;
  perA4SheetCents: number;
  envelopeC5Cents: number;
  envelopeC4Cents: number;
  postageCents: Record<PostalPostage, number>;
};

const DEFAULT_REFERENCE_SCENARIO = {
  printedPages: 1,
  physicalSheets: 1,
  envelopeFormat: "C5",
} as const;

function getReferenceScenario(): PublicPricingReferenceScenario {
  const config = env();

  return {
    ...DEFAULT_REFERENCE_SCENARIO,
    standardPostage: config.EPOST_STANDARD_POSTAGE,
    registeredPostage: config.EPOST_REGISTERED_POSTAGE,
  };
}

function getReferencePostage(
  deliveryType: DeliveryType,
  scenario: PublicPricingReferenceScenario,
): PostalPostage {
  return deliveryType === "registered"
    ? scenario.registeredPostage
    : scenario.standardPostage;
}

function getProviderReferenceQuoteCents(
  deliveryType: DeliveryType,
  scenario: PublicPricingReferenceScenario,
): number {
  return (
    EPOST_PUBLIC_RATES.perPrintedPageCents * scenario.printedPages +
    EPOST_PUBLIC_RATES.perA4SheetCents * scenario.physicalSheets +
    (scenario.envelopeFormat === "C4"
      ? EPOST_PUBLIC_RATES.envelopeC4Cents
      : EPOST_PUBLIC_RATES.envelopeC5Cents) +
    EPOST_PUBLIC_RATES.postageCents[getReferencePostage(deliveryType, scenario)]
  );
}

export function calculatePrice(deliveryType: DeliveryType): PriceBreakdown {
  const config = env();
  const scenario = getReferenceScenario();
  const providerQuotedCents = getProviderReferenceQuoteCents(deliveryType, scenario);
  const swissMailMarkupCents =
    deliveryType === "registered"
      ? config.PRICE_REGISTERED_MARKUP_CENTS
      : config.PRICE_STANDARD_MARKUP_CENTS;

  const baseCents = providerQuotedCents;
  const deliverySurchargeCents = swissMailMarkupCents;
  const pageSurchargeCents = 0;
  const attachmentSurchargeCents = 0;

  const totalCents =
    baseCents + deliverySurchargeCents + pageSurchargeCents + attachmentSurchargeCents;

  return {
    baseCents,
    deliverySurchargeCents,
    pageSurchargeCents,
    attachmentSurchargeCents,
    totalCents,
  };
}

export function formatCHF(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `CHF ${whole}.${frac.toString().padStart(2, "0")}`;
}

export function getPublicPricing() {
  const standard = calculatePrice("standard");
  const registered = calculatePrice("registered");
  const registeredSurchargeCents = registered.totalCents - standard.totalCents;
  const referenceScenario = getReferenceScenario();

  return PublicPricingResponseSchema.parse({
    standard: {
      totalCents: standard.totalCents,
      displayPrice: formatCHF(standard.totalCents),
      currency: "CHF",
      providerQuotedCents: standard.baseCents,
      providerQuotedDisplayPrice: formatCHF(standard.baseCents),
      swissMailMarkupCents: standard.deliverySurchargeCents,
      swissMailMarkupDisplayPrice: formatCHF(standard.deliverySurchargeCents),
    },
    registered: {
      totalCents: registered.totalCents,
      displayPrice: formatCHF(registered.totalCents),
      currency: "CHF",
      providerQuotedCents: registered.baseCents,
      providerQuotedDisplayPrice: formatCHF(registered.baseCents),
      swissMailMarkupCents: registered.deliverySurchargeCents,
      swissMailMarkupDisplayPrice: formatCHF(registered.deliverySurchargeCents),
    },
    registeredSurchargeCents,
    registeredSurchargeDisplayPrice: formatCHF(registeredSurchargeCents),
    providerBreakdown: {
      providerName: "ePost",
      note: "Reference scenario verified against official ePost public pricing inputs for one printed page, one A4 sheet, one C5 envelope, and the currently configured postage mapping.",
      sourceUrl: EPOST_SOURCE_URL,
      verifiedDate: VERIFIED_DATE,
      perPrintedPageCents: EPOST_PUBLIC_RATES.perPrintedPageCents,
      perA4SheetCents: EPOST_PUBLIC_RATES.perA4SheetCents,
      envelopeC5Cents: EPOST_PUBLIC_RATES.envelopeC5Cents,
      envelopeC4Cents: EPOST_PUBLIC_RATES.envelopeC4Cents,
      postageCents: EPOST_PUBLIC_RATES.postageCents,
      firstSheetC5Cents: {
        simplexCents:
          EPOST_PUBLIC_RATES.perPrintedPageCents +
          EPOST_PUBLIC_RATES.perA4SheetCents +
          EPOST_PUBLIC_RATES.envelopeC5Cents,
        duplexCents:
          EPOST_PUBLIC_RATES.perPrintedPageCents * 2 +
          EPOST_PUBLIC_RATES.perA4SheetCents +
          EPOST_PUBLIC_RATES.envelopeC5Cents,
      },
      additionalA4SheetCents: {
        simplexCents:
          EPOST_PUBLIC_RATES.perPrintedPageCents + EPOST_PUBLIC_RATES.perA4SheetCents,
        duplexCents:
          EPOST_PUBLIC_RATES.perPrintedPageCents * 2 + EPOST_PUBLIC_RATES.perA4SheetCents,
      },
      referenceScenario,
      pricesExcludeVat: true,
      currency: "CHF",
    },
  });
}
