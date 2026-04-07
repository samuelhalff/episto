import type { PostalPostage } from "@swiss-mail/shared";

import { env } from "../../shared/config/index.js";
export { formatCHF, getPublicPricing } from "./public-pricing.service.js";

export interface PriceBreakdown {
  baseCents: number;
  deliverySurchargeCents: number;
  pageSurchargeCents: number;
  attachmentSurchargeCents: number;
  totalCents: number;
}

export type DeliveryType = "standard" | "registered";

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

interface ReferenceScenario {
  printedPages: number;
  physicalSheets: number;
  envelopeFormat: "C5" | "C4";
  standardPostage: PostalPostage;
  registeredPostage: PostalPostage;
}

function getReferenceScenario(): ReferenceScenario {
  const config = env();

  return {
    ...DEFAULT_REFERENCE_SCENARIO,
    standardPostage: config.EPOST_STANDARD_POSTAGE,
    registeredPostage: config.EPOST_REGISTERED_POSTAGE,
  };
}

function getReferencePostage(
  deliveryType: DeliveryType,
  scenario: ReferenceScenario,
): PostalPostage {
  return deliveryType === "registered"
    ? scenario.registeredPostage
    : scenario.standardPostage;
}

function getProviderReferenceQuoteCents(
  deliveryType: DeliveryType,
  scenario: ReferenceScenario,
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
