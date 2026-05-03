"use client";

import type { ReactNode } from "react";
import { Lock, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@episto/shared";
import { formatCentsAsCHF } from "../../hooks/use-pricing";
import { useDispatchQuote } from "../../hooks/use-dispatch-quote";
import { getApiErrorUserMessage } from "../../lib/api";
import { DeliveryTypeBadge } from "./DeliveryTypeBadge";
import { StatusBadge } from "../ui/status-badge";

export function PriceSummary({
  draftId,
  deliveryType,
  subject,
  showTrustNote = false,
  quoteEnabled = true,
  pendingLabel,
  loadingMessage,
}: {
  draftId?: string;
  deliveryType: string;
  subject: string | null;
  showTrustNote?: boolean;
  quoteEnabled?: boolean;
  pendingLabel?: string | undefined;
  loadingMessage?: string | undefined;
}) {
  const t = useTranslations("checkout");
  const quote = useDispatchQuote(draftId ?? "", Boolean(draftId) && quoteEnabled);
  const isRegistered = deliveryType === DeliveryType.registered;
  const quoteErrorMessage = getApiErrorUserMessage(quote.error) ?? t("priceUnavailable");
  const summaryNote = !quoteEnabled
    ? pendingLabel
    : quote.isLoading
      ? (loadingMessage ?? t("pricingLoading"))
      : quote.isError
        ? quoteErrorMessage
        : t("draftingIncluded");
  const totalValue: ReactNode = !quoteEnabled ? (
    "—"
  ) : quote.isLoading ? (
    <span className="animate-shimmer inline-block h-4 w-20 rounded-full" />
  ) : quote.data ? (
    formatCentsAsCHF(quote.data.totalCents)
  ) : null;

  return (
    <div className="app-panel rounded-3xl p-6 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("orderSummary")}
          </h2>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{summaryNote}</p>
        </div>
        <span className="app-list-item-muted inline-flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-500 dark:text-zinc-300">
          <ReceiptText className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 space-y-4 text-sm">
        <div className="app-list-item-muted rounded-2xl p-4">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {subject ?? t("defaultLetterTitle")}
          </p>
          {!quote.isError ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{summaryNote}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
          <span>{t("delivery")}</span>
          <DeliveryTypeBadge
            deliveryType={deliveryType}
            label={
              isRegistered ? t("deliveryRegisteredLabel") : t("deliveryStandardLabel")
            }
          />
        </div>
        {quote.data?.lineItems?.length ? (
          <div className="space-y-2">
            {quote.data.lineItems.map((lineItem) => {
              const label =
                lineItem.source === "provider"
                  ? t("providerQuoteLabel")
                  : t("swissMailServiceLabel");

              return (
                <div
                  key={`${lineItem.source}-${lineItem.label}`}
                  className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300"
                >
                  <span>{label}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCentsAsCHF(lineItem.amountCents)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        {quote.isError ? (
          <div className="app-list-item-muted rounded-2xl px-4 py-4 text-[var(--action-choice-active-fg)]">
            <StatusBadge tone="warning">{t("livePricingTitle")}</StatusBadge>
            <p className="mt-1 text-sm leading-6">{quoteErrorMessage}</p>
          </div>
        ) : (
          <div className="app-list-item-muted rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-50">
              <span>{t("total")}</span>
              <span className="text-lg">{totalValue}</span>
            </div>
          </div>
        )}
        {showTrustNote && !quote.isError ? (
          <div className="app-list-item-muted flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span>{t("secureCheckout")}</span>
          </div>
        ) : !quoteEnabled && pendingLabel ? (
          <div className="app-list-item-muted rounded-xl px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
            {pendingLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
