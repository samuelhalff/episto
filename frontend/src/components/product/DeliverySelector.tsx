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
    {
      key: DeliveryType.standard,
      label: t("deliveryStandard"),
      price: standardPrice,
      badge: t("deliveryStandardBadge"),
      description: t("deliveryStandardDescription"),
    },
    {
      key: DeliveryType.registered,
      label: t("deliveryRegistered"),
      price: registeredPrice,
      badge: t("deliveryRegisteredBadge"),
      description: t("deliveryRegisteredDescription"),
    },
  ] as const;

  return (
    <div role="radiogroup" aria-label={t("deliveryTypeLabel")} className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          aria-label={`${opt.label} — ${opt.price}`}
          onClick={() => onChange(opt.key)}
          className={`w-full rounded-2xl border px-4 py-4 text-left text-sm transition ${
            value === opt.key
              ? "border-primary bg-primary/5 text-primary"
              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  value === opt.key ? "border-primary" : "border-gray-300"
                }`}
              >
                {value === opt.key && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{opt.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {opt.badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{opt.description}</p>
              </div>
            </div>
            <span className="shrink-0 text-base font-semibold text-gray-900">
              {opt.price}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
