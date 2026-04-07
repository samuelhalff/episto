"use client";

import { useTranslations } from "next-intl";
import { usePricing } from "../../hooks/use-pricing";

export function PricingFromText({
  titleClassName,
  noteClassName,
}: {
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
      <p className={titleClassName}>{title}</p>
      <p className={noteClassName}>{note}</p>
    </>
  );
}
