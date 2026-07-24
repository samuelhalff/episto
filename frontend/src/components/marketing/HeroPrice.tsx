"use client";

import { useTranslations } from "next-intl";
import { usePricing } from "../../hooks/use-pricing";
import { MarketingBody } from "./typography";

// Live "from" price for the hero. Prices are never hardcoded — this reads the
// same cached public pricing the rest of the site uses, and falls back to a
// price-free reassurance line while the data loads or if it is unavailable.
export function HeroPrice() {
  const t = useTranslations("marketing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const label = standard
    ? t("pricingFrom", { price: standard.displayPrice })
    : t("pricingFromFallback");

  return (
    <MarketingBody as="p" className="mt-6 text-sm">
      <span className="font-semibold text-[var(--app-fg)]">{label}</span>
      <span className="text-[var(--app-muted)]">
        {" · "}
        {t("homepage.hero.priceReassurance")}
      </span>
    </MarketingBody>
  );
}
