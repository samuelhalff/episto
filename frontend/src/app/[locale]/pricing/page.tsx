import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PricingBreakdownSection } from "@/components/marketing/PricingPageClient";
import { buildMarketingMetadata, buildServiceJsonLd } from "@/lib/marketing-seo";
import { getServicePriceBand } from "@/lib/server-pricing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/pricing",
    title: t("pricing.title"),
    description: t("pricing.description"),
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tm = await getTranslations({ locale, namespace: "marketing" });
  const seo = await getTranslations({ locale, namespace: "seo" });
  const priceBand = await getServicePriceBand();

  return (
    <>
      <JsonLd
        data={buildServiceJsonLd({
          locale,
          title: seo("pricing.title"),
          description: seo("pricing.description"),
          pathname: "/pricing",
          priceBand,
        })}
      />
      <MarketingLayout>
        <MarketingHero
          eyebrow={t("noHiddenFees")}
          title={t("title")}
          subtitle={t("subtitle")}
          primaryAction={{ href: "/draft/new", label: t("cta") }}
          secondaryAction={{ href: "/help", label: tm("nav.help") }}
        />
        <PricingBreakdownSection />
      </MarketingLayout>
    </>
  );
}
