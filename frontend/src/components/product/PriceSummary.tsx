"use client";

import { Lock, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing.js";

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
    <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            {t("orderSummary")}
          </h2>
          <p className="mt-2 text-xs text-stone-400">{t("draftingIncluded")}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ReceiptText className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 space-y-4 text-sm">
        <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/70 p-4">
          <p className="font-semibold text-stone-900">
            {subject ?? t("defaultLetterTitle")}
          </p>
          <p className="mt-1 text-xs text-stone-500">{t("draftingIncluded")}</p>
        </div>
        <div className="flex items-center justify-between text-stone-600">
          <span>{t("delivery")}</span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
            {isRegistered ? t("deliveryRegisteredLabel") : t("deliveryStandardLabel")}
          </span>
        </div>
        <div className="rounded-[1.35rem] bg-stone-950 px-4 py-4 text-white">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("total")}</span>
            <span className="text-lg">{price}</span>
          </div>
        </div>
        {showTrustNote ? (
          <div className="flex items-center gap-2 rounded-[1.1rem] bg-stone-50 px-3 py-2 text-xs text-stone-500">
            <Lock className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span>{t("secureCheckout")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
