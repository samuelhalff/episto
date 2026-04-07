import { getTranslations } from "next-intl/server";
import { JsonLd } from "../../components/marketing/JsonLd";
import { ConfidenceBlock } from "../../components/marketing/ConfidenceBlock";
import { FinalCTABand } from "../../components/marketing/FinalCTABand";
import { HomepageHero } from "../../components/marketing/HomepageHero";
import { HowItWorksSteps } from "../../components/marketing/HowItWorksSteps";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { PricingFromText } from "../../components/marketing/PricingFromText";
import { TrustStrip } from "../../components/marketing/TrustStrip";
import { UseCaseGrid } from "../../components/marketing/UseCaseGrid";
import {
  buildMarketingMetadata,
  buildOrganizationJsonLd,
  buildServiceJsonLd,
  buildWebsiteJsonLd,
} from "../../lib/marketing-seo";
import { routing } from "../../i18n/routing";
import { MarketingSection } from "../../components/marketing/primitives";

type Locale = (typeof routing.locales)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "",
    title: t("home.title"),
    description: t("home.description"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  const seo = await getTranslations({ locale, namespace: "seo" });

  return (
    <>
      <JsonLd
        data={[
          buildOrganizationJsonLd(),
          buildWebsiteJsonLd(),
          buildServiceJsonLd({
            locale,
            title: seo("home.title"),
            description: seo("home.description"),
          }),
        ]}
      />
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
    </>
  );
}
