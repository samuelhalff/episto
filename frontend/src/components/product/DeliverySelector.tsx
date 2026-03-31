"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeliveryType } from "@swiss-mail/shared";
import { usePricing, formatCentsAsCHF } from "../../hooks/use-pricing";

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
            className={`w-full rounded-2.5xl px-4 py-4 text-left text-sm transition active:scale-[0.99] ${
              selected
                ? "bg-zinc-950 text-white shadow-lg dark:bg-amber-400 dark:text-zinc-950"
                : "bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
            style={!selected ? { outline: "1px solid var(--app-border)" } : undefined}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border ${
                      selected
                        ? "border-white/40 bg-white/15 text-white dark:border-zinc-950/20 dark:bg-zinc-950/10 dark:text-zinc-950"
                        : "border-zinc-300 bg-white text-transparent dark:border-zinc-700 dark:bg-zinc-950"
                    }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-semibold ${selected ? "text-white dark:text-zinc-950" : "text-zinc-900 dark:text-zinc-50"}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${selected ? "bg-white/12 text-white/80 dark:bg-zinc-950/10 dark:text-zinc-900/80" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p
                      className={`mt-1 text-sm ${selected ? "text-white/75 dark:text-zinc-900/80" : "text-zinc-500 dark:text-zinc-400"}`}
                  >
                    {opt.description}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 text-base font-semibold ${selected ? "text-white dark:text-zinc-950" : "text-zinc-900 dark:text-zinc-50"}`}
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
