import { useTranslations } from "next-intl";
import { ConfidenceBlock } from "../../components/marketing/ConfidenceBlock";
import { FinalCTABand } from "../../components/marketing/FinalCTABand";
import { HomepageHero } from "../../components/marketing/HomepageHero";
import { HowItWorksSteps } from "../../components/marketing/HowItWorksSteps";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { PricingFromText } from "../../components/marketing/PricingFromText";
import { TrustStrip } from "../../components/marketing/TrustStrip";
import { UseCaseGrid } from "../../components/marketing/UseCaseGrid";
import { MarketingSection } from "../../components/marketing/primitives";

export default function HomePage() {
  const t = useTranslations("marketing");

  return (
    <MarketingLayout mainClassName="transition-colors dark:text-zinc-50">
      <HomepageHero />
      <TrustStrip />
      <HowItWorksSteps />
      <ConfidenceBlock />
      <UseCaseGrid />
      <MarketingSection>
        <FinalCTABand
          title={t("ctaTitle")}
          body={
            <PricingFromText
              titleClassName="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl md:text-6xl"
              noteClassName="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:mt-4 sm:text-base"
            />
          }
          primaryAction={{ href: "/draft/new", label: t("ctaButton") }}
        />
      </MarketingSection>
    </MarketingLayout>
  );
}
