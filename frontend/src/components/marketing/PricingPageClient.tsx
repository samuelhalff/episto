"use client";

import type { ReactNode } from "react";
import type { PostalPostage, PublicPricingResponse } from "@swiss-mail/shared";
import { Check, CircleSlash, ShieldQuestion } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePricing } from "../../hooks/use-pricing";
import { StatusBadge, type StatusBadgeTone } from "../ui/status-badge";
import { FinalCTABand } from "./FinalCTABand";
import { PricingFromText } from "./PricingFromText";
import { MarketingCard, MarketingNotice, MarketingSection, SectionLabel, cx } from "./primitives";

type TranslationValues = Record<string, string | number | Date>;
type TranslationFn = (key: string, values?: TranslationValues) => string;
type PricingTier = PublicPricingResponse["standard"];
type PricingSync = PublicPricingResponse["sync"];
type PricingProvider = PublicPricingResponse["providerBreakdown"];
type PricingExample = PricingProvider["pageCountExamples"]["standard"][number];

export function PricingHeroPanel() {
  const t = useTranslations("pricing");

  return (
    <div className="space-y-4">
      <PricingFromText
        titleClassName="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 md:text-5xl"
        noteClassName="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300"
      />
      <p className="max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("totalsSharedSourceNote")}
      </p>
    </div>
  );
}

export function PricingBreakdownSection() {
  const locale = useLocale();
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const registered = pricing.data?.registered ?? null;
  const provider = pricing.data?.providerBreakdown ?? null;
  const sync = pricing.data?.sync ?? null;
  const hasPricingData = Boolean(pricing.data);
  const showPriceSections = pricing.isLoading || hasPricingData;
  const showMissingPricingNotice = pricing.isError && !pricing.isLoading && !hasPricingData;

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
          {showMissingPricingNotice ? (
            <MarketingNotice className="text-zinc-600 dark:text-zinc-300">
              {t("pricingUnavailableBody")}
            </MarketingNotice>
          ) : null}

          {sync ? (
            <PricingSyncCard
              locale={locale}
              sync={sync}
              sourceUrl={provider?.sourceUrl}
              t={t}
            />
          ) : null}

          {showPriceSections ? (
            <>
              <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
                <PricingTotalsCard
                  loading={pricing.isLoading}
                  registered={registered}
                  registeredSurchargeDisplayPrice={pricing.data?.registeredSurchargeDisplayPrice}
                  standard={standard}
                  t={t}
                />
                <PricingCompositionCard
                  loading={pricing.isLoading}
                  registered={registered}
                  standard={standard}
                  t={t}
                />
              </div>

              {provider ? (
                <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                  <PricingAssumptionsCard provider={provider} t={t} />
                  <PricingMatrixExamplesCard
                    loading={pricing.isLoading}
                    provider={provider}
                    t={t}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </MarketingSection>

      <PricingSupportSections
        loading={pricing.isLoading}
        pricingFaqs={pricingFaqs}
        registered={registered}
        showComparison={showPriceSections}
        standard={standard}
      />
    </>
  );
}

function PricingSyncCard({
  locale,
  sync,
  sourceUrl,
  t,
}: {
  locale: string;
  sync: PricingSync;
  sourceUrl: string | undefined;
  t: TranslationFn;
}) {
  const isStale = sync.freshness === "stale";
  const tone: StatusBadgeTone = isStale ? "warning" : "success";

  return (
    <MarketingCard tone={isStale ? "muted" : "soft"}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              {t("syncStatusTitle")}
            </h2>
            <StatusBadge tone={tone}>
              {isStale ? t("syncStaleLabel") : t("syncFreshLabel")}
            </StatusBadge>
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {isStale ? t("syncStaleBody") : t("syncFreshBody")}
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:min-w-[24rem]">
          <SyncDetail label={t("syncSourceLabel")} value={sync.sourceLabel} />
          <SyncDetail
            label={t("syncLastSyncedLabel")}
            value={formatSyncTimestamp(locale, sync.lastSyncedAt)}
          />
        </dl>
      </div>

      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex text-sm font-medium text-amber-700 underline decoration-amber-300 underline-offset-4 dark:text-amber-400"
        >
          {t("sourceLinkLabel")}
        </a>
      ) : null}
    </MarketingCard>
  );
}

function PricingTotalsCard({
  loading,
  registered,
  registeredSurchargeDisplayPrice,
  standard,
  t,
}: {
  loading: boolean;
  registered: PricingTier | null;
  registeredSurchargeDisplayPrice: string | undefined;
  standard: PricingTier | null;
  t: TranslationFn;
}) {
  return (
    <MarketingCard tone="contrast">
      <SectionLabel className="text-white/70 dark:text-amber-200/80">
        {t("pricingTableTitle")}
      </SectionLabel>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white dark:text-zinc-50 md:text-4xl">
        {t("summaryCardTitle")}
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 dark:text-zinc-300">
        {t("summaryCardBody")}
      </p>

      <div className="mt-8 space-y-3">
        <PricingRow
          label={t("standardTotalLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={standard?.displayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingRow
          label={t("registeredAddonLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={registeredSurchargeDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingRow
          label={t("registeredTotalLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={registered?.displayPrice}
              fallback={t("priceUnavailable")}
            />
          }
          highlight
        />
      </div>

      <p className="mt-6 text-sm leading-7 text-white/75 dark:text-zinc-300">
        {t("totalsSharedSourceNote")}
      </p>
      <p className="mt-4 text-sm leading-7 text-white/75 dark:text-zinc-300">
        {t("checkoutTruth")}
      </p>
    </MarketingCard>
  );
}

function PricingCompositionCard({
  loading,
  registered,
  standard,
  t,
}: {
  loading: boolean;
  registered: PricingTier | null;
  standard: PricingTier | null;
  t: TranslationFn;
}) {
  return (
    <MarketingCard tone="soft">
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("compositionTitle")}
      </h3>
      <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("compositionBody")}
      </p>

      <div className="mt-6 space-y-3">
        <PricingRow
          label={t("serviceStandardFeeLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={standard?.swissMailMarkupDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingRow
          label={t("serviceRegisteredFeeLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={registered?.swissMailMarkupDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingRow
          label={t("providerStandardQuoteLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={standard?.providerQuotedDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
        />
        <PricingRow
          label={t("providerRegisteredQuoteLabel")}
          price={
            <PriceAmount
              loading={loading}
              value={registered?.providerQuotedDisplayPrice}
              fallback={t("priceUnavailable")}
            />
          }
          highlight
        />
      </div>
    </MarketingCard>
  );
}

function PricingAssumptionsCard({
  provider,
  t,
}: {
  provider: PricingProvider;
  t: TranslationFn;
}) {
  return (
    <MarketingCard>
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("referenceAssumptionsTitle")}
      </h3>
      <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("referenceAssumptionsBody")}
      </p>

      <div className="mt-6 space-y-3">
        <PricingRow
          label={t("assumptionCountryLabel")}
          price={provider.referenceScenario.shippingCountry}
        />
        <PricingRow
          label={t("assumptionEnvelopeLabel")}
          price={provider.referenceScenario.envelopeSize}
        />
        <PricingRow
          label={t("assumptionWindowLabel")}
          price={formatReferenceValue(provider.referenceScenario.windowLocation)}
        />
        <PricingRow
          label={t("assumptionDuplexLabel")}
          price={provider.referenceScenario.duplex ? "Duplex" : t("duplexFalseValue")}
        />
        <PricingRow
          label={t("assumptionAttachmentLabel")}
          price={
            provider.referenceScenario.attachmentMode === "none"
              ? t("attachmentNoneValue")
              : formatReferenceValue(provider.referenceScenario.attachmentMode)
          }
        />
        <PricingRow
          label={t("assumptionStandardPostageLabel")}
          price={getPostageLabel(t, provider.referenceScenario.standardPostage)}
        />
        <PricingRow
          label={t("assumptionRegisteredPostageLabel")}
          price={getPostageLabel(t, provider.referenceScenario.registeredPostage)}
        />
      </div>

      <div className="mt-6 space-y-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
        <p>{provider.note}</p>
        <p>{t("verifiedOnLabel", { date: provider.verifiedDate })}</p>
      </div>
    </MarketingCard>
  );
}

function PricingMatrixExamplesCard({
  loading,
  provider,
  t,
}: {
  loading: boolean;
  provider: PricingProvider;
  t: TranslationFn;
}) {
  return (
    <MarketingCard tone="muted">
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("matrixExamplesTitle")}
      </h3>
      <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("matrixExamplesBody")}
      </p>

      <div className="mt-6 space-y-6">
        <PricingExamplesTable
          examples={provider.pageCountExamples.standard}
          loading={loading}
          title={t("standardExamplesTitle")}
          t={t}
        />
        <PricingExamplesTable
          examples={provider.pageCountExamples.registered}
          loading={loading}
          title={t("registeredExamplesTitle")}
          t={t}
        />
      </div>
    </MarketingCard>
  );
}

function PricingExamplesTable({
  examples,
  loading,
  title,
  t,
}: {
  examples: PricingExample[];
  loading: boolean;
  title: string;
  t: TranslationFn;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h4>

      {examples.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                <th className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
                  {t("pagesColumnLabel")}
                </th>
                <th className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
                  {t("providerQuoteColumnLabel")}
                </th>
                <th className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
                  {t("totalColumnLabel")}
                </th>
              </tr>
            </thead>
            <tbody>
              {examples.map((example) => (
                <tr key={`${title}-${example.pageCount}`} className="text-sm">
                  <td className="border-b border-zinc-200/80 px-4 py-4 font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                    {example.pageCount}
                  </td>
                  <td className="border-b border-zinc-200/80 px-4 py-4 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    <PriceAmount
                      loading={loading}
                      value={example.providerQuotedDisplayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  </td>
                  <td className="border-b border-zinc-200/80 px-4 py-4 font-semibold text-zinc-950 dark:border-zinc-800 dark:text-zinc-50">
                    <PriceAmount
                      loading={loading}
                      value={example.displayPrice}
                      fallback={t("priceUnavailable")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MarketingNotice className="mt-3 text-zinc-600 dark:text-zinc-300">
          {t("priceUnavailable")}
        </MarketingNotice>
      )}
    </div>
  );
}

function PricingSupportSections({
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

function getPostageLabel(t: TranslationFn, postage: PostalPostage) {
  return t(`postageLabels.${postage}`);
}

function formatSyncTimestamp(locale: string, value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatReferenceValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function SyncDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-4 dark:bg-zinc-950/30">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">{value}</dd>
    </div>
  );
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
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{children}</span>
    </div>
  );
}

function ExcludedItem({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface-muted flex items-start gap-3 rounded-2xl px-4 py-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <CircleSlash className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{children}</span>
    </div>
  );
}
