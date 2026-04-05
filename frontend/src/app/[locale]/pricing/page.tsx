import { useTranslations } from "next-intl";
import { MarketingHero } from "../../../components/marketing/MarketingHero";
import { MarketingLayout } from "../../../components/marketing/MarketingLayout";
import {
  PricingBreakdownSection,
  PricingHeroPanel,
} from "../../../components/marketing/PricingPageClient";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tm = useTranslations("marketing");

  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow={t("noHiddenFees")}
        title={t("title")}
        subtitle={t("subtitle")}
        primaryAction={{ href: "/draft/new", label: t("cta") }}
        secondaryAction={{ href: "/help", label: tm("nav.help") }}
        panel={<PricingHeroPanel />}
      />
      <PricingBreakdownSection />
    </MarketingLayout>
  );
}
