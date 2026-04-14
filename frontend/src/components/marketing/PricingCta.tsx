"use client";

import { useTranslations } from "next-intl";
import { FinalCTABand } from "./FinalCTABand";
import { MarketingSection } from "./primitives";

export function PricingCtaSection() {
  const t = useTranslations("pricing");

  return (
    <MarketingSection spacing="compact" trimTop>
      <FinalCTABand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaBandTitle")}
        body={t("ctaBandBody")}
        primaryAction={{ href: "/draft/new", label: t("cta") }}
      />
    </MarketingSection>
  );
}
