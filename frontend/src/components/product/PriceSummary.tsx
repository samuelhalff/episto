"use client";

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
}: {
  deliveryType: string;
  subject: string | null;
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
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        {t("orderSummary")}
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{subject ?? t("defaultLetterTitle")}</span>
          <span className="font-medium">{price}</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between font-semibold text-foreground">
            <span>{t("total")}</span>
            <span>{price}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
