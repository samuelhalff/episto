"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing.js";

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
      {options.map((opt) => {
        const selected = value === opt.key;

        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${opt.label} — ${opt.price}`}
            onClick={() => onChange(opt.key)}
            className={`w-full rounded-[1.5rem] border px-4 py-4 text-left text-sm transition ${
              selected
                ? "border-stone-900 bg-stone-950 text-white shadow-[0_18px_40px_rgba(28,25,23,0.16)]"
                : "border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected
                      ? "border-white/40 bg-white/15 text-white"
                      : "border-stone-300 bg-white text-transparent"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-semibold ${selected ? "text-white" : "text-stone-900"}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${selected ? "bg-white/12 text-white/80" : "bg-stone-100 text-stone-600"}`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${selected ? "text-white/75" : "text-stone-500"}`}
                  >
                    {opt.description}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 text-base font-semibold ${selected ? "text-white" : "text-stone-900"}`}
              >
                {opt.price}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
