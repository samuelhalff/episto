"use client";

import { getPerPageIncrementDisplayPrice } from "./pricing-calculations";
import { MarketingCard, MarketingNotice, MarketingSection } from "./primitives";
import { PriceAmount, PricingValueRow } from "./pricing-shared";
import { PricingSimulator } from "./PricingSimulator";
import type { PricingProvider, PricingTier } from "./pricing-types";

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
    <div className="marketing-surface-muted min-w-0 rounded-[1.75rem] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
        {title}
      </p>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
        <PriceAmount
          loading={loading}
          value={totalDisplayPrice}
          fallback={t("priceUnavailable")}
        />
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {t("priceCaption")}
      </p>

      {priceChanges.length > 0 ? (
        <div className="mt-5 space-y-3">
          {priceChanges.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-[var(--app-surface-soft)]/85 px-4 py-3 dark:bg-zinc-950/30"
            >
              <PricingValueRow
                label={item.label}
                labelClassName="text-zinc-600 dark:text-zinc-300"
                value={
                  <PriceAmount
                    loading={loading}
                    value={item.value}
                    fallback={t("priceUnavailable")}
                  />
                }
              />
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
  standard,
  t,
}: {
  loading: boolean;
  provider: PricingProvider | null;
  registered: PricingTier | null;
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
      label: t("registeredAdditionalPageLabel"),
      loading,
      value: registeredPerPageIncrement,
    }),
  ].filter((item): item is PriceChangeItem => item !== null);

  return (
    <MarketingCard tone="soft">
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
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

export function PricingTiersSection({
  loading,
  provider,
  registered,
  showMissingPricingNotice,
  showPriceSections,
  standard,
  t,
}: {
  loading: boolean;
  provider: PricingProvider | null;
  registered: PricingTier | null;
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
              standard={standard}
              t={t}
            />

            {provider ? (
              <PricingSimulator loading={loading} provider={provider} t={t} />
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingSection>
  );
}
