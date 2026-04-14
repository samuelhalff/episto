"use client";

import { ShieldQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExcludedItem, IncludedItem } from "./pricing-shared";
import { MarketingCard, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

export function PricingFaqSection({
  pricingFaqs,
}: {
  pricingFaqs: Array<{ question: string; answer: string }>;
}) {
  const t = useTranslations("pricing");

  return (
    <>
      <MarketingSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <MarketingCard className="h-full">
            <MarketingHeading
              as="h3"
              className="text-2xl font-semibold tracking-[-0.03em] text-emerald-700 dark:text-emerald-300"
            >
              {t("includedCardTitle")}
            </MarketingHeading>
            <div className="mt-6 space-y-3">
              <IncludedItem>{t("includedDrafting")}</IncludedItem>
              <IncludedItem>{t("includedFormatting")}</IncludedItem>
              <IncludedItem>{t("includedRendering")}</IncludedItem>
              <IncludedItem>{t("includedDispatch")}</IncludedItem>
            </div>
          </MarketingCard>

          <MarketingCard className="h-full">
            <MarketingHeading
              as="h3"
              className="text-2xl font-semibold tracking-[-0.03em] text-red-700 dark:text-red-300"
            >
              {t("excludedCardTitle")}
            </MarketingHeading>
            <div className="mt-6 space-y-3">
              <ExcludedItem>{t("excludedLegalReview")}</ExcludedItem>
              <ExcludedItem>{t("excludedGuaranteedOutcome")}</ExcludedItem>
              <ExcludedItem>{t("excludedTranslation")}</ExcludedItem>
              <ExcludedItem>{t("excludedDesign")}</ExcludedItem>
            </div>
          </MarketingCard>
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <div className="space-y-6">
          <div className="max-w-3xl">
            <MarketingHeading
              as="h2"
              className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl"
            >
              {t("faqTitle")}
            </MarketingHeading>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {pricingFaqs.map((faq) => (
              <MarketingCard key={faq.question} className="p-5">
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    <ShieldQuestion className="h-4 w-4" />
                  </span>
                  <div>
                    <MarketingHeading as="h3" className="text-base font-semibold">
                      {faq.question}
                    </MarketingHeading>
                    <MarketingBody className="mt-2 text-sm leading-7">
                      {faq.answer}
                    </MarketingBody>
                  </div>
                </div>
              </MarketingCard>
            ))}
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
