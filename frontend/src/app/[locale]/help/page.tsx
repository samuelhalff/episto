import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ChevronDown } from "lucide-react";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HelpPageCta } from "@/components/marketing/HelpPageCta";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { buildHelpFaqs } from "@/components/marketing/faq-content";
import { MarketingSection } from "@/components/marketing/primitives";
import {
  MarketingBody,
  MarketingHeading,
  MarketingMeta,
} from "@/components/marketing/typography";
import { buildFaqJsonLd, buildMarketingMetadata } from "@/lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/help",
    title: t("help.title"),
    description: t("help.description"),
  });
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  const tm = await getTranslations({ locale, namespace: "marketing" });

  const faqs = buildHelpFaqs(t);

  return (
    <>
      <JsonLd data={buildFaqJsonLd(faqs)} />
      <MarketingLayout>
        <MarketingSection spacing="compact">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <MarketingHeading
                as="h1"
                className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl"
              >
                {t("faqTitle")}
              </MarketingHeading>
              <MarketingBody
                tone="muted"
                className="mt-4 max-w-md text-sm leading-relaxed sm:text-base"
              >
                {t("subtitle")}
              </MarketingBody>
            </div>

            <div>
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className="hairline group border-t py-4 first:border-t-0 first:pt-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <MarketingHeading
                      as="h2"
                      className="text-base font-semibold tracking-[-0.01em] sm:text-lg"
                    >
                      {faq.question}
                    </MarketingHeading>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--app-muted)] transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <MarketingBody tone="soft" className="mt-3 max-w-2xl text-sm leading-7">
                    {faq.answer}
                  </MarketingBody>
                </details>
              ))}
            </div>
          </div>
        </MarketingSection>

        <MarketingSection spacing="tight">
          <HelpPageCta
            eyebrow={t("ctaEyebrow")}
            title={t("ctaTitle")}
            body={t("ctaBody")}
            actionLabel={tm("ctaButton")}
          />
        </MarketingSection>

        <MarketingSection spacing="compact" trimTop>
          <div className="hairline flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <MarketingHeading
                as="h2"
                className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
              >
                {t("contactTitle")}
              </MarketingHeading>
              <MarketingBody
                tone="muted"
                className="mt-2 max-w-md text-sm leading-relaxed"
              >
                {t("contactDescription")}
              </MarketingBody>
              <MarketingMeta className="mt-2 text-xs">
                {t("contactResponseTime")}
              </MarketingMeta>
            </div>
            <a href={`mailto:${t("contactEmail")}`} className="btn-primary shrink-0">
              {t("contactEmail")}
            </a>
          </div>
        </MarketingSection>
      </MarketingLayout>
    </>
  );
}
