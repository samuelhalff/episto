"use client";

import { useTranslations } from "next-intl";
import { usePricing } from "../../hooks/use-pricing";
import { MarketingBody, MarketingHeading } from "./typography";

export function PricingFromText({
  initialPrice,
  titleClassName,
  noteClassName,
}: {
  initialPrice?: string | undefined;
  titleClassName: string;
  noteClassName: string;
}) {
  const t = useTranslations("marketing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const provider = pricing.data?.providerBreakdown ?? null;
  const standardReferenceExample = provider?.pageCountExamples.standard[0] ?? null;

  const title = standard
    ? t("pricingFrom", { price: standard.displayPrice })
    : initialPrice
      ? t("pricingFrom", { price: initialPrice })
      : t("pricingFromFallback");

  const note =
    standard && provider && standardReferenceExample && standard.swissMailMarkupCents > 0
      ? t("pricingNotes", {
          service: standard.swissMailMarkupDisplayPrice,
          printedPages: standardReferenceExample.pageCount,
          physicalSheets: standardReferenceExample.pageCount,
          envelopeFormat: provider.referenceScenario.envelopeSize,
        })
      : t("pricingNotesFallback");

  return (
    <>
      <MarketingHeading as="p" tone="accent" className={titleClassName}>
        {title}
      </MarketingHeading>
      <MarketingBody as="p" tone="accentMuted" className={noteClassName}>
        {note}
      </MarketingBody>
    </>
  );
}
