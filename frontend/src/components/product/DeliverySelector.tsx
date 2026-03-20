"use client";

import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing.js";

/**
 * Delivery type selector for the review page.
 *
 * Shows Standard vs Registered options with backend-driven prices.
 */
export function DeliverySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  const t = useTranslations("review");
  const pricing = usePricing();

  const standardPrice = pricing.data
    ? pricing.data.standard.displayPrice
    : formatCentsAsCHF(490);
  const registeredPrice = pricing.data
    ? pricing.data.registered.displayPrice
    : formatCentsAsCHF(890);

  const options = [
    { key: DeliveryType.standard, label: t("deliveryStandard"), price: standardPrice },
    { key: DeliveryType.registered, label: t("deliveryRegistered"), price: registeredPrice },
  ] as const;

  return (
    <div role="radiogroup" aria-label={t("deliveryTypeLabel")} className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          aria-label={`${opt.label} — ${opt.price}`}
          onClick={() => onChange(opt.key)}
          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
            value === opt.key
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-border"
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                value === opt.key
                  ? "border-primary"
                  : "border-muted-foreground"
              }`}
            >
              {value === opt.key && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </span>
            {opt.label}
          </span>
          <span className="font-medium">{opt.price}</span>
        </button>
      ))}
    </div>
  );
}
