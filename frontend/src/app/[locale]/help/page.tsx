import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { HelpCircle, Mail } from "lucide-react";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HelpPageCta } from "@/components/marketing/HelpPageCta";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { buildHelpFaqs } from "@/components/marketing/faq-content";
import { MarketingCard, MarketingSection } from "@/components/marketing/primitives";
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
        {/* FAQ Section */}
        <MarketingSection spacing="compact">
          <div className="mx-auto max-w-3xl text-center">
            <MarketingHeading
              as="h1"
              className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl"
            >
              {t("faqTitle")}
            </MarketingHeading>
            <MarketingBody
              tone="muted"
              className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base"
            >
              {t("subtitle")}
            </MarketingBody>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 md:grid-cols-2 md:gap-5">
            {faqs.map((faq) => (
              <FaqCard key={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </MarketingSection>

        {/* Write a letter CTA */}
        <MarketingSection spacing="tight">
          <HelpPageCta
            eyebrow={t("ctaEyebrow")}
            title={t("ctaTitle")}
            body={t("ctaBody")}
            actionLabel={tm("ctaButton")}
          />
        </MarketingSection>

        {/* Contact — below FAQs */}
        <MarketingSection spacing="compact" trimTop>
          <MarketingCard className="mx-auto max-w-2xl rounded-2xl p-6 text-center sm:rounded-3xl sm:p-8 md:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
              <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <MarketingHeading
              as="h2"
              className="mt-5 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            >
              {t("contactTitle")}
            </MarketingHeading>
            <MarketingBody
              tone="muted"
              className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base"
            >
              {t("contactDescription")}
            </MarketingBody>
            <a
              href={`mailto:${t("contactEmail")}`}
              className="btn-primary mt-5 inline-flex rounded-full px-6 py-3"
            >
              {t("contactEmail")}
            </a>
            <MarketingMeta className="mt-3 text-xs">
              {t("contactResponseTime")}
            </MarketingMeta>
          </MarketingCard>
        </MarketingSection>
      </MarketingLayout>
    </>
  );
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <MarketingCard className="rounded-2xl p-5 sm:rounded-3xl">
      <div className="flex gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
          <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <MarketingHeading as="h3" className="text-base font-semibold">
            {question}
          </MarketingHeading>
          <MarketingBody tone="soft" className="mt-2 text-sm leading-relaxed">
            {answer}
          </MarketingBody>
        </div>
      </div>
    </MarketingCard>
  );
}
