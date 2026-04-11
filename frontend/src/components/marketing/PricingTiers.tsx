"use client";

import type { PostalPostage } from "@swiss-mail/shared";
import { MarketingCard, MarketingNotice, MarketingSection, SectionLabel } from "./primitives";
import { StatusBadge, type StatusBadgeTone } from "../ui/status-badge";
import { PriceAmount, PricingRow, SyncDetail } from "./pricing-shared";
import type { PricingExample, PricingProvider, PricingSync, PricingTier } from "./pricing-types";

type TranslationValues = Record<string, string | number | Date>;
type TranslationFn = (key: string, values?: TranslationValues) => string;

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
        <PricingRow label={t("assumptionCountryLabel")} price={provider.referenceScenario.shippingCountry} />
        <PricingRow label={t("assumptionEnvelopeLabel")} price={provider.referenceScenario.envelopeSize} />
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

export function PricingTiersSection({
  locale,
  loading,
  provider,
  registered,
  registeredSurchargeDisplayPrice,
  showMissingPricingNotice,
  showPriceSections,
  standard,
  sync,
  t,
}: {
  locale: string;
  loading: boolean;
  provider: PricingProvider | null;
  registered: PricingTier | null;
  registeredSurchargeDisplayPrice: string | undefined;
  showMissingPricingNotice: boolean;
  showPriceSections: boolean;
  standard: PricingTier | null;
  sync: PricingSync | null;
  t: TranslationFn;
}) {
  return (
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
                loading={loading}
                registered={registered}
                registeredSurchargeDisplayPrice={registeredSurchargeDisplayPrice}
                standard={standard}
                t={t}
              />
              <PricingCompositionCard
                loading={loading}
                registered={registered}
                standard={standard}
                t={t}
              />
            </div>

            {provider ? (
              <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                <PricingAssumptionsCard provider={provider} t={t} />
                <PricingMatrixExamplesCard loading={loading} provider={provider} t={t} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingSection>
  );
}
