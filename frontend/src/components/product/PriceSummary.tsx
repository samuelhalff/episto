"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing.js";

/**
 * Order summary displaying the calculated price for a draft.
 *
 * Prices are fetched from the backend pricing endpoint.
 */
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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
        {t("orderSummary")}
      </h2>
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">
            {subject ?? t("defaultLetterTitle")}
          </p>
          <p className="text-xs text-gray-500">{t("draftingIncluded")}</p>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>{t("delivery")}</span>
          <span className="font-medium text-gray-900">
            {isRegistered ? t("deliveryRegisteredLabel") : t("deliveryStandardLabel")}
          </span>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between font-semibold text-gray-900">
            <span>{t("total")}</span>
            <span className="text-base">{price}</span>
          </div>
        </div>
        {showTrustNote ? (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>{t("secureCheckout")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
