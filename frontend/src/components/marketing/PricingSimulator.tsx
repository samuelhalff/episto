"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import {
  getExampleForPageCount,
  getPageBounds,
  getPerPageIncrementDisplayPrice,
} from "./pricing-calculations";
import { MarketingCard, MarketingNotice } from "./primitives";
import { PriceAmount } from "./pricing-shared";
import type { PricingProvider } from "./pricing-types";
import { Input } from "../ui/input";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type TranslationValues = Record<string, string | number | Date>;

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function StepperButton({
  ariaLabel,
  children,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:text-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

export function PricingSimulator({
  loading,
  provider,
  t,
}: {
  loading: boolean;
  provider: PricingProvider;
  t: (key: string, values?: TranslationValues) => string;
}) {
  const [deliveryType, setDeliveryType] = React.useState<"standard" | "registered">(
    "standard",
  );
  const [pageCount, setPageCount] = React.useState(1);

  const selectedExamples =
    deliveryType === "registered"
      ? provider.pageCountExamples.registered
      : provider.pageCountExamples.standard;
  const bounds = getPageBounds(selectedExamples);
  const minPageCount = bounds?.min ?? 1;
  const maxPageCount = bounds?.max ?? 1;
  const safePageCount = clamp(pageCount, minPageCount, maxPageCount);

  React.useEffect(() => {
    if (pageCount !== safePageCount) {
      setPageCount(safePageCount);
    }
  }, [pageCount, safePageCount]);

  const selectedExample = getExampleForPageCount(selectedExamples, safePageCount);
  const perPageIncrement = getPerPageIncrementDisplayPrice(selectedExamples);
  const pageLabel = safePageCount === 1 ? t("pageSingular") : t("pagePlural");
  const summary = `${deliveryType === "registered" ? t("registeredOptionTitle") : t("standardOptionTitle")} · ${safePageCount} ${pageLabel}`;
  const additionalPageLabel =
    deliveryType === "registered"
      ? t("registeredAdditionalPageLabel")
      : t("standardAdditionalPageLabel");
  const controlsDisabled = loading || !bounds;

  return (
    <MarketingCard tone="muted">
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("simulatorTitle")}
      </h3>

      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("letterTypeLabel")}
          </p>
          <ToggleGroup
            type="single"
            value={deliveryType}
            onValueChange={(value) => {
              if (value === "standard" || value === "registered") {
                setDeliveryType(value);
              }
            }}
            className="mt-2 w-full md:w-auto"
            disabled={loading}
            aria-label={t("letterTypeLabel")}
          >
            <ToggleGroupItem value="standard">{t("standardOptionTitle")}</ToggleGroupItem>
            <ToggleGroupItem value="registered">
              {t("registeredOptionTitle")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("pagesLabel")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StepperButton
              ariaLabel={t("decreasePagesLabel")}
              disabled={controlsDisabled || safePageCount <= minPageCount}
              onClick={() =>
                setPageCount((current) => clamp(current - 1, minPageCount, maxPageCount))
              }
            >
              <Minus className="h-4 w-4" />
            </StepperButton>
            <Input
              value={String(safePageCount)}
              readOnly
              aria-label={t("pagesLabel")}
              className="w-16 text-center font-semibold"
            />
            <StepperButton
              ariaLabel={t("increasePagesLabel")}
              disabled={controlsDisabled || safePageCount >= maxPageCount}
              onClick={() =>
                setPageCount((current) => clamp(current + 1, minPageCount, maxPageCount))
              }
            >
              <Plus className="h-4 w-4" />
            </StepperButton>
          </div>
        </div>
      </div>

      {bounds ? (
        <div className="mt-6 rounded-3xl border border-zinc-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
            <p className="min-w-0 text-sm font-medium leading-6 text-zinc-700 dark:text-zinc-200">
              {summary}
            </p>
            <div className="shrink-0 text-right text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              <PriceAmount
                loading={loading}
                value={selectedExample?.displayPrice}
                fallback={t("priceUnavailable")}
              />
            </div>
          </div>

          {loading || perPageIncrement ? (
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {additionalPageLabel}{" "}
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                <PriceAmount
                  loading={loading}
                  value={perPageIncrement}
                  fallback={t("priceUnavailable")}
                />
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <MarketingNotice className="mt-6 text-zinc-600 dark:text-zinc-300">
          {t("priceUnavailable")}
        </MarketingNotice>
      )}
    </MarketingCard>
  );
}
