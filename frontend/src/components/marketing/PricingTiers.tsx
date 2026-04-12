"use client";

import {
  getPerPageIncrementDisplayPrice,
  getExampleForPageCount,
  getPageBounds,
} from "./pricing-calculations";
import { MarketingCard, MarketingNotice, MarketingSection } from "./primitives";
import { PriceAmount } from "./pricing-shared";
import type { PricingExample, PricingProvider, PricingTier } from "./pricing-types";

type TranslationValues = Record<string, string | number | Date>;
type TranslationFn = (key: string, values?: TranslationValues) => string;

interface PriceChangeItem {
  label: string;
  value: string | undefined;
}

function createPriceChange({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value: string | undefined;
}): PriceChangeItem | null {
  if (!loading && !value) {
    return null;
  }

  return {
    label,
    value,
  };
}

function PricingOptionCard({
  loading,
  priceChanges,
  title,
  totalDisplayPrice,
  t,
}: {
  loading: boolean;
  priceChanges: PriceChangeItem[];
  title: string;
  totalDisplayPrice: string | undefined;
  t: TranslationFn;
}) {
  return (
    <div className="min-w-0 rounded-[1.75rem] bg-white/10 p-5 dark:bg-white/5">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70 dark:text-amber-200/80">
        {title}
      </p>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white dark:text-zinc-50">
        <PriceAmount
          loading={loading}
          value={totalDisplayPrice}
          fallback={t("priceUnavailable")}
        />
      </div>
      <p className="mt-2 text-sm leading-6 text-white/70 dark:text-zinc-300">
        {t("priceCaption")}
      </p>

      {priceChanges.length > 0 ? (
        <div className="mt-5 space-y-3">
          {priceChanges.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-black/10 px-4 py-3 dark:bg-zinc-950/30"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="min-w-0 flex-1 text-sm leading-6 text-white/75 dark:text-zinc-300">
                  {item.label}
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-white dark:text-zinc-50">
                  <PriceAmount
                    loading={loading}
                    value={item.value}
                    fallback={t("priceUnavailable")}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PricingTotalsCard({
  loading,
  provider,
  registered,
  registeredSurchargeDisplayPrice,
  standard,
  t,
}: {
  loading: boolean;
  provider: PricingProvider | null;
  registered: PricingTier | null;
  registeredSurchargeDisplayPrice: string | undefined;
  standard: PricingTier | null;
  t: TranslationFn;
}) {
  const standardPerPageIncrement = provider
    ? getPerPageIncrementDisplayPrice(provider.pageCountExamples.standard)
    : undefined;
  const registeredPerPageIncrement = provider
    ? getPerPageIncrementDisplayPrice(provider.pageCountExamples.registered)
    : undefined;

  const standardPriceChanges = [
    createPriceChange({
      label: t("standardAdditionalPageLabel"),
      loading,
      value: standardPerPageIncrement,
    }),
  ].filter((item): item is PriceChangeItem => item !== null);

  const registeredPriceChanges = [
    createPriceChange({
      label: t("registeredUpgradeLabel"),
      loading,
      value: registeredSurchargeDisplayPrice
        ? `+${registeredSurchargeDisplayPrice}`
        : undefined,
    }),
    createPriceChange({
      label: t("registeredAdditionalPageLabel"),
      loading,
      value: registeredPerPageIncrement,
    }),
  ].filter((item): item is PriceChangeItem => item !== null);

  return (
    <MarketingCard tone="contrast">
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white dark:text-zinc-50 md:text-4xl">
        {t("summaryCardTitle")}
      </h2>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <PricingOptionCard
          loading={loading}
          priceChanges={standardPriceChanges}
          title={t("standardOptionTitle")}
          totalDisplayPrice={standard?.displayPrice}
          t={t}
        />
        <PricingOptionCard
          loading={loading}
          priceChanges={registeredPriceChanges}
          title={t("registeredOptionTitle")}
          totalDisplayPrice={registered?.displayPrice}
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
                  {t("exampleTotalColumnLabel")}
                </th>
              </tr>
            </thead>
            <tbody>
              {examples.map((example) => (
                <tr key={`${title}-${example.pageCount}`} className="text-sm">
                  <td className="border-b border-zinc-200/80 px-4 py-4 font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                    {example.pageCount}
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

function PricingExamplesCard({
  loading,
  provider,
  t,
}: {
  loading: boolean;
  provider: PricingProvider;
  t: TranslationFn;
}) {
  return (
    <MarketingCard className="overflow-hidden" tone="muted">
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("pricingExamplesTitle")}
      </h3>
      <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("pricingExamplesBody")}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
  loading,
  provider,
  registered,
  registeredSurchargeDisplayPrice,
  showMissingPricingNotice,
  showPriceSections,
  standard,
  t,
}: {
  loading: boolean;
  provider: PricingProvider | null;
  registered: PricingTier | null;
  registeredSurchargeDisplayPrice: string | undefined;
  showMissingPricingNotice: boolean;
  showPriceSections: boolean;
  standard: PricingTier | null;
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

        {showPriceSections ? (
          <>
            <PricingTotalsCard
              loading={loading}
              provider={provider}
              registered={registered}
              registeredSurchargeDisplayPrice={registeredSurchargeDisplayPrice}
              standard={standard}
              t={t}
            />

            {provider ? (
              <PricingExamplesCard loading={loading} provider={provider} t={t} />
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingSection>
  );
}
