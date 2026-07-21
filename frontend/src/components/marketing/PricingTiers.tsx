"use client";

import { getPerPageIncrementDisplayPrice } from "./pricing-calculations";
import { MarketingNotice, MarketingSection } from "./primitives";
import { PriceAmount } from "./pricing-shared";
import { PricingSimulator } from "./PricingSimulator";
import type { PricingProvider, PricingTier } from "./pricing-types";
import { MarketingBody, MarketingHeading } from "./typography";

type TranslationValues = Record<string, string | number | Date>;
type TranslationFn = (key: string, values?: TranslationValues) => string;

function TariffRow({
  title,
  caption,
  note,
  loading,
  price,
  fallback,
}: {
  title: string;
  caption: string;
  note?: string | undefined;
  loading: boolean;
  price: string | undefined;
  fallback: string;
}) {
  return (
    <div className="hairline flex flex-col gap-2 border-t py-6 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <MarketingHeading
          as="dt"
          className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
        >
          {title}
        </MarketingHeading>
        <MarketingBody className="mt-1.5 text-sm leading-6">{caption}</MarketingBody>
        {note ? (
          <MarketingBody tone="muted" className="mt-1 text-sm">
            {note}
          </MarketingBody>
        ) : null}
      </div>
      <MarketingHeading
        as="dd"
        className="numeral shrink-0 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
      >
        <PriceAmount loading={loading} value={price} fallback={fallback} />
      </MarketingHeading>
    </div>
  );
}

function PricingTariff({
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
  const standardPerPage = provider
    ? getPerPageIncrementDisplayPrice(provider.pageCountExamples.standard)
    : undefined;
  const registeredPerPage = provider
    ? getPerPageIncrementDisplayPrice(provider.pageCountExamples.registered)
    : undefined;

  return (
    <div>
      <MarketingHeading
        as="h2"
        className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl md:text-4xl"
      >
        {t("summaryCardTitle")}
      </MarketingHeading>
      <dl className="mt-8">
        <TariffRow
          title={t("standardOptionTitle")}
          caption={t("priceCaption")}
          note={
            !loading && standardPerPage
              ? `${t("standardAdditionalPageLabel")} ${standardPerPage}`
              : undefined
          }
          loading={loading}
          price={standard?.displayPrice}
          fallback={t("priceUnavailable")}
        />
        <TariffRow
          title={t("registeredOptionTitle")}
          caption={t("priceCaption")}
          note={
            !loading && registeredPerPage
              ? `${t("registeredAdditionalPageLabel")} ${registeredPerPage}`
              : undefined
          }
          loading={loading}
          price={registered?.displayPrice}
          fallback={t("priceUnavailable")}
        />
      </dl>
    </div>
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
    <MarketingSection spacing="tight" trimTop trimBottom>
      <div className="space-y-12">
        {showMissingPricingNotice ? (
          <MarketingNotice>
            <MarketingBody>{t("pricingUnavailableBody")}</MarketingBody>
          </MarketingNotice>
        ) : null}

        {showPriceSections ? (
          <>
            <PricingTariff
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
