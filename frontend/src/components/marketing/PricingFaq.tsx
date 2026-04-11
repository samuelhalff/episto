"use client";

import { ShieldQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { ComparisonRow, ExcludedItem, IncludedItem, PriceAmount } from "./pricing-shared";
import type { PricingTier } from "./pricing-types";
import { MarketingCard, MarketingSection, SectionLabel } from "./primitives";

export function PricingFaqSection({
  loading,
  pricingFaqs,
  registered,
  showComparison,
  standard,
}: {
  loading: boolean;
  pricingFaqs: Array<{ question: string; answer: string }>;
  registered: PricingTier | null;
  showComparison: boolean;
  standard: PricingTier | null;
}) {
  const t = useTranslations("pricing");

  return (
    <>
      {showComparison ? (
        <MarketingSection muted>
          <div className="space-y-6">
            <div className="max-w-3xl">
              <SectionLabel className="text-amber-700 dark:text-amber-400">
                {t("comparisonEyebrow")}
              </SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
                {t("comparisonTitle")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {t("comparisonBody")}
              </p>
            </div>

            <MarketingCard className="overflow-x-auto p-0">
              <div className="min-w-[40rem]">
                <div className="grid grid-cols-[1.15fr_0.85fr_0.85fr] border-b border-zinc-200/80 bg-[var(--app-surface-soft)] text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div className="px-4 py-4">{t("comparisonFeatureHeading")}</div>
                  <div className="px-4 py-4">{t("comparisonStandardHeading")}</div>
                  <div className="px-4 py-4">{t("comparisonRegisteredHeading")}</div>
                </div>
                <ComparisonRow
                  feature={t("comparisonServiceLevelLabel")}
                  standard={t("comparisonServiceLevelStandard")}
                  registered={t("comparisonServiceLevelRegistered")}
                />
                <ComparisonRow
                  feature={t("comparisonTrackingLabel")}
                  standard={t("comparisonTrackingStandard")}
                  registered={t("comparisonTrackingRegistered")}
                />
                <ComparisonRow
                  feature={t("comparisonConfirmationLabel")}
                  standard={t("comparisonConfirmationStandard")}
                  registered={t("comparisonConfirmationRegistered")}
                />
                <ComparisonRow
                  feature={t("comparisonPriceLabel")}
                  standard={
                    <PriceAmount
                      loading={loading}
                      value={standard?.displayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                  registered={
                    <PriceAmount
                      loading={loading}
                      value={registered?.displayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                  emphasizePrice
                />
              </div>
            </MarketingCard>
          </div>
        </MarketingSection>
      ) : null}

      <MarketingSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <MarketingCard>
            <SectionLabel className="text-amber-700 dark:text-amber-400">
              {t("includedCardEyebrow")}
            </SectionLabel>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {t("includedCardTitle")}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {t("includedCardBody")}
            </p>
            <div className="mt-6 space-y-3">
              <IncludedItem>{t("includedDrafting")}</IncludedItem>
              <IncludedItem>{t("includedFormatting")}</IncludedItem>
              <IncludedItem>{t("includedRendering")}</IncludedItem>
              <IncludedItem>{t("includedDispatch")}</IncludedItem>
            </div>
          </MarketingCard>

          <MarketingCard tone="muted">
            <SectionLabel className="text-amber-700 dark:text-amber-400">
              {t("excludedCardEyebrow")}
            </SectionLabel>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {t("excludedCardTitle")}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {t("excludedCardBody")}
            </p>
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
            <SectionLabel className="text-amber-700 dark:text-amber-400">
              {t("faqEyebrow")}
            </SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("faqTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {t("faqBody")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {pricingFaqs.map((faq) => (
              <MarketingCard key={faq.question} className="p-5">
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    <ShieldQuestion className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                      {faq.answer}
                    </p>
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
