"use client";

import type { ReactNode } from "react";
import type { PostalPostage } from "@swiss-mail/shared";
import {
  Check,
  CircleSlash,
  FileStack,
  MailOpen,
  ReceiptText,
  ShieldQuestion,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePricing } from "../../hooks/use-pricing";
import { FinalCTABand } from "./FinalCTABand";
import { PricingFromText } from "./PricingFromText";
import {
  MarketingBadge,
  MarketingCard,
  MarketingNotice,
  MarketingSection,
  SectionLabel,
  cx,
} from "./primitives";

export function PricingHeroPanel() {
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const provider = pricing.data?.providerBreakdown ?? null;
  const standardReferenceExample = provider?.pageCountExamples.standard[0] ?? null;

  return (
    <div>
      <MarketingBadge className="text-amber-700 dark:text-amber-300">
        <Check className="h-4 w-4" />
        {t("noHiddenFees")}
      </MarketingBadge>
      <div className="mt-6">
        <PricingFromText
          titleClassName="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 md:text-5xl"
          noteClassName="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300"
        />
      </div>

      {pricing.isError ? (
        <MarketingNotice className="mt-6 text-zinc-600 dark:text-zinc-300">
          {t("pricingUnavailableBody")}
        </MarketingNotice>
      ) : null}

      <div className="mt-8 space-y-3">
        <PricingInlineRow
          label={t("standardTotalLabel")}
          price={
            <PriceAmount
              loading={pricing.isLoading}
              value={pricing.data?.standard.displayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingInlineRow
          label={t("registeredAddonLabel")}
          price={
            <PriceAmount
              loading={pricing.isLoading}
              value={pricing.data?.registeredSurchargeDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingInlineRow
          label={t("registeredTotalLabel")}
          price={
            <PriceAmount
              loading={pricing.isLoading}
              value={pricing.data?.registered.displayPrice}
              fallback={t("priceUnavailable")}
            />
          }
          highlight
        />
      </div>

      {provider ? (
        <p className="mt-6 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
          {t("referenceScenarioInline", {
            printedPages: standardReferenceExample?.pageCount ?? 1,
            physicalSheets: standardReferenceExample?.pageCount ?? 1,
            envelopeFormat: provider.referenceScenario.envelopeSize,
          })}
        </p>
      ) : null}
    </div>
  );
}

export function PricingBreakdownSection() {
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const registered = pricing.data?.registered ?? null;
  const provider = pricing.data?.providerBreakdown ?? null;
  const standardExamples = provider?.pageCountExamples.standard ?? [];
  const registeredExamples = provider?.pageCountExamples.registered ?? [];
  const firstStandardExample = standardExamples[0] ?? null;
  const firstRegisteredExample = registeredExamples[0] ?? null;
  const lastStandardExample = standardExamples[standardExamples.length - 1] ?? null;
  const lastRegisteredExample = registeredExamples[registeredExamples.length - 1] ?? null;

  const currentStandardPostage = provider
    ? getPostageLabel(t, provider.referenceScenario.standardPostage)
    : t("priceUnavailable");
  const currentRegisteredPostage = provider
    ? getPostageLabel(t, provider.referenceScenario.registeredPostage)
    : t("priceUnavailable");

  const providerRows = [
    {
      label: t("providerStandardQuoteLabel"),
      value: firstStandardExample?.providerQuotedDisplayPrice,
    },
    {
      label: t("providerRegisteredQuoteLabel"),
      value: firstRegisteredExample?.providerQuotedDisplayPrice,
    },
    {
      label: t("standardTotalLabel"),
      value: firstStandardExample?.displayPrice,
    },
    {
      label: t("registeredTotalLabel"),
      value: firstRegisteredExample?.displayPrice,
    },
  ];

  const pricingFaqs = [
    { question: t("faq1q"), answer: t("faq1a") },
    { question: t("faq2q"), answer: t("faq2a") },
    { question: t("faq3q"), answer: t("faq3a") },
    { question: t("faq4q"), answer: t("faq4a") },
  ];

  return (
    <>
      <MarketingSection className="pb-0 pt-0 md:pt-0">
        <div className="space-y-6">
          {pricing.isError ? (
            <MarketingNotice className="text-zinc-600 dark:text-zinc-300">
              {t("pricingUnavailableBody")}
            </MarketingNotice>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <MarketingCard tone="contrast">
              <SectionLabel className="text-white/70 dark:text-amber-200/80">
                {t("serviceCardEyebrow")}
              </SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white dark:text-zinc-50 md:text-4xl">
                {t("serviceCardTitle")}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 dark:text-zinc-300">
                {t("serviceCardBody")}
              </p>
              <div className="mt-8 space-y-4">
                <PricingFeature
                  icon={<ReceiptText className="h-5 w-5" />}
                  label={t("serviceFeeLabel")}
                  description={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={standard?.swissMailMarkupDisplayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                />
                <PricingFeature
                  icon={<MailOpen className="h-5 w-5" />}
                  label={t("providerStandardQuoteLabel")}
                  description={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={standard?.providerQuotedDisplayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                />
                <PricingFeature
                  icon={<FileStack className="h-5 w-5" />}
                  label={t("providerRegisteredQuoteLabel")}
                  description={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={registered?.providerQuotedDisplayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                />
              </div>
            </MarketingCard>

            <MarketingCard tone="soft" className="space-y-6">
              <div>
                <SectionLabel className="text-amber-700 dark:text-amber-400">
                  {t("pricingTableTitle")}
                </SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
                  {t("summaryCardTitle")}
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {t("summaryCardBody")}
                </p>
              </div>

              <div className="space-y-3">
                <PricingRow
                  label={t("baseServiceLabel")}
                  price={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={standard?.displayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                />
                <PricingRow
                  label={t("registeredAddonLabel")}
                  price={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={pricing.data?.registeredSurchargeDisplayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                />
                <PricingRow
                  label={t("registeredTotalLabel")}
                  price={
                    <PriceAmount
                      loading={pricing.isLoading}
                      value={registered?.displayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  }
                  highlight
                />
              </div>

              <MarketingNotice className="text-zinc-600 dark:text-zinc-300">
                {t("checkoutTruth")}
              </MarketingNotice>
            </MarketingCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <MarketingCard>
              <SectionLabel className="text-amber-700 dark:text-amber-400">
                {t("providerCardEyebrow")}
              </SectionLabel>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
                {t("providerCardTitle")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {t("providerCardBody")}
              </p>
              <div className="mt-6 space-y-3">
                {providerRows.map((row) => (
                  <PricingRow
                    key={row.label}
                    label={row.label}
                    price={
                      <PriceAmount
                        loading={pricing.isLoading}
                        value={row.value}
                        fallback={t("priceUnavailable")}
                      />
                    }
                  />
                ))}
              </div>
              <p className="mt-5 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
                {provider?.pricesExcludeVat ? t("providerVatNote") : t("vatIncludedNote")}
              </p>
            </MarketingCard>

            <MarketingCard tone="muted">
              <SectionLabel className="text-amber-700 dark:text-amber-400">
                {t("referenceCardEyebrow")}
              </SectionLabel>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
                {t("referenceCardTitle")}
              </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {provider
                    ? t("referenceCardBody", {
                      printedPages: firstStandardExample?.pageCount ?? 1,
                      physicalSheets: firstStandardExample?.pageCount ?? 1,
                      envelopeFormat: provider.referenceScenario.envelopeSize,
                      standardPostage: currentStandardPostage,
                      registeredPostage: currentRegisteredPostage,
                    })
                  : t("referenceCardFallback")}
                </p>
                <div className="mt-6 space-y-3">
                  <PricingRow
                    label={`${t("standardTotalLabel")} (${firstStandardExample?.pageCount ?? 1})`}
                    price={
                      <PriceAmount
                        loading={pricing.isLoading}
                        value={firstStandardExample?.displayPrice}
                        fallback={t("priceUnavailable")}
                      />
                    }
                  />
                  <PricingRow
                    label={`${t("registeredTotalLabel")} (${firstRegisteredExample?.pageCount ?? 1})`}
                    price={
                      <PriceAmount
                        loading={pricing.isLoading}
                        value={firstRegisteredExample?.displayPrice}
                        fallback={t("priceUnavailable")}
                      />
                    }
                  />
                  <PricingRow
                    label={`${t("standardTotalLabel")} (${lastStandardExample?.pageCount ?? 1})`}
                    price={
                      <PriceAmount
                        loading={pricing.isLoading}
                        value={lastStandardExample?.displayPrice}
                        fallback={t("priceUnavailable")}
                      />
                    }
                  />
                  <PricingRow
                    label={`${t("registeredTotalLabel")} (${lastRegisteredExample?.pageCount ?? 1})`}
                    price={
                      <PriceAmount
                        loading={pricing.isLoading}
                        value={lastRegisteredExample?.displayPrice}
                        fallback={t("priceUnavailable")}
                      />
                    }
                />
              </div>
              {provider ? (
                <div className="mt-6 space-y-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
                  <p>{t("verifiedOnLabel", { date: provider.verifiedDate })}</p>
                  <a
                    href={provider.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-amber-700 underline decoration-amber-300 underline-offset-4 dark:text-amber-400"
                  >
                    {t("sourceLinkLabel")}
                  </a>
                </div>
              ) : null}
            </MarketingCard>
          </div>
        </div>
      </MarketingSection>

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
                    loading={pricing.isLoading}
                    value={standard?.displayPrice}
                    fallback={t("priceUnavailable")}
                  />
                }
                registered={
                  <PriceAmount
                    loading={pricing.isLoading}
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

      <MarketingSection className="pt-0">
        <FinalCTABand
          eyebrow={t("ctaEyebrow")}
          title={t("ctaBandTitle")}
          body={t("ctaBandBody")}
          primaryAction={{ href: "/draft/new", label: t("cta") }}
        />
      </MarketingSection>
    </>
  );
}

function getPostageLabel(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  postage: PostalPostage,
) {
  return t(`postageLabels.${postage}`);
}

function PriceAmount({
  loading,
  value,
  fallback,
}: {
  loading: boolean;
  value: string | undefined;
  fallback: string;
}) {
  if (loading) {
    return <span className="animate-shimmer inline-block h-4 w-20 rounded-full" />;
  }

  return <>{value ?? fallback}</>;
}

function PricingFeature({
  icon,
  label,
  description,
}: {
  icon: ReactNode;
  label: string;
  description: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-amber-300 dark:text-amber-200">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white dark:text-zinc-50">{label}</p>
          <p className="mt-1 text-sm text-zinc-200/90 dark:text-zinc-300">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingInlineRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="marketing-surface rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
        <span
          className={cx(
            "text-right text-sm font-semibold",
            highlight
              ? "text-amber-700 dark:text-amber-400"
              : "text-zinc-950 dark:text-zinc-50",
          )}
        >
          {price}
        </span>
      </div>
    </div>
  );
}

function PricingRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="marketing-surface-muted flex items-start justify-between gap-4 rounded-2xl px-4 py-3">
      <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{label}</span>
      <span
        className={cx(
          "text-right text-sm font-semibold",
          highlight
            ? "text-amber-700 dark:text-amber-400"
            : "text-zinc-950 dark:text-zinc-50",
        )}
      >
        {price}
      </span>
    </div>
  );
}

function ComparisonRow({
  feature,
  standard,
  registered,
  emphasizePrice = false,
}: {
  feature: ReactNode;
  standard: ReactNode;
  registered: ReactNode;
  emphasizePrice?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1.15fr_0.85fr_0.85fr] border-b border-zinc-200/80 last:border-b-0 dark:border-zinc-800">
      <div className="px-4 py-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {feature}
      </div>
      <div
        className={cx(
          "px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400",
          emphasizePrice && "font-semibold text-zinc-950 dark:text-zinc-50",
        )}
      >
        {standard}
      </div>
      <div
        className={cx(
          "px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400",
          emphasizePrice && "font-semibold text-amber-700 dark:text-amber-400",
        )}
      >
        {registered}
      </div>
    </div>
  );
}

function IncludedItem({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface-muted flex items-start gap-3 rounded-2xl px-4 py-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {children}
      </span>
    </div>
  );
}

function ExcludedItem({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface-muted flex items-start gap-3 rounded-2xl px-4 py-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <CircleSlash className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {children}
      </span>
    </div>
  );
}
