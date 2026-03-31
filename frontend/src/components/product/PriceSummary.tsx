"use client";

import { Lock, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing";

export function PriceSummary({
  deliveryType,
  subject,
  showTrustNote = false,
}: {
  deliveryType: string;
  subject: string | null;
  showTrustNote?: boolean;
}) {
  const t = useTranslations("checkout");
  const pricing = usePricing();

  const isRegistered = deliveryType === DeliveryType.registered;

  const price = pricing.data
    ? isRegistered
      ? pricing.data.registered.displayPrice
      : pricing.data.standard.displayPrice
    : formatCentsAsCHF(isRegistered ? 890 : 490);

  return (
    <div
      className="rounded-3xl bg-white p-6 shadow-sm transition-colors dark:bg-zinc-900"
      style={{ outline: "1px solid var(--app-border)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("orderSummary")}
          </h2>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{t("draftingIncluded")}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
          <ReceiptText className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 space-y-4 text-sm">
        <div
          className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950"
          style={{ outline: "1px solid var(--app-border)" }}
        >
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {subject ?? t("defaultLetterTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("draftingIncluded")}</p>
        </div>
        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
          <span>{t("delivery")}</span>
          <span className="rounded-lg bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {isRegistered ? t("deliveryRegisteredLabel") : t("deliveryStandardLabel")}
          </span>
        </div>
        <div className="rounded-2xl bg-zinc-950 px-4 py-4 text-white dark:bg-amber-400 dark:text-zinc-950">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("total")}</span>
            <span className="text-lg">{price}</span>
          </div>
        </div>
        {showTrustNote ? (
          <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span>{t("secureCheckout")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
