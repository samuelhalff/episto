"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePricing } from "@/hooks/use-pricing";
import { PricingCtaSection } from "./PricingCta";
import { PricingFaqSection } from "./PricingFaq";
export { PricingHeroPanel } from "./PricingHero";
import { PricingTiersSection } from "./PricingTiers";

export function PricingBreakdownSection() {
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const registered = pricing.data?.registered ?? null;
  const provider = pricing.data?.providerBreakdown ?? null;
  const hasPricingData = Boolean(pricing.data);
  const showPriceSections = pricing.isLoading || hasPricingData;
  const showMissingPricingNotice =
    pricing.isError && !pricing.isLoading && !hasPricingData;
  const pricingFaqs = useMemo(
    () => [
      { question: t("faq1q"), answer: t("faq1a") },
      { question: t("faq2q"), answer: t("faq2a") },
      { question: t("faq3q"), answer: t("faq3a") },
      { question: t("faq4q"), answer: t("faq4a") },
    ],
    [t],
  );

  return (
    <>
      <PricingTiersSection
        loading={pricing.isLoading}
        provider={provider}
        registered={registered}
        showMissingPricingNotice={showMissingPricingNotice}
        showPriceSections={showPriceSections}
        standard={standard}
        t={t}
      />
      <PricingFaqSection pricingFaqs={pricingFaqs} />
      <PricingCtaSection />
    </>
  );
}
