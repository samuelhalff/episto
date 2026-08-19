"use client";

import { useTranslations } from "next-intl";
import type { usePromoQuote } from "@/hooks/use-api";
import { getApiErrorUserMessage } from "@/lib/api";

export function PromoCodeField({
  promoCode,
  onPromoCodeChange,
  promo,
}: {
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  promo: ReturnType<typeof usePromoQuote>;
}) {
  const t = useTranslations("checkout");
  const error = getApiErrorUserMessage(promo.error);
  const pending =
    Boolean(promoCode.trim()) && (promo.isPendingValidation || promo.isFetching);

  return (
    <div className="app-panel rounded-3xl p-6">
      <label
        htmlFor="promoCode"
        className="block text-sm font-semibold text-[var(--app-fg)]"
      >
        {t("promoCode")}
      </label>
      <p className="mt-1 text-xs text-[var(--app-muted)]">{t("promoCodeHelp")}</p>
      <input
        id="promoCode"
        type="text"
        autoComplete="off"
        value={promoCode}
        onChange={(event) => onPromoCodeChange(event.target.value)}
        className="app-form-control mt-3 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 uppercase tracking-wider text-[var(--app-fg)] placeholder:text-[var(--app-muted)] transition-[border-color,box-shadow,background-color,color] focus:border-[var(--app-border-strong)] focus:outline-none focus:ring-2 focus:ring-amber-200/60 dark:focus:ring-amber-300/20"
      />
      <div className="mt-2 min-h-5 text-sm" aria-live="polite">
        {pending ? (
          <p role="status" className="text-[var(--app-muted)]">
            {t("checkingPromoCode")}
          </p>
        ) : error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : promo.isValidated ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            {t("promoCodeValidated", { code: promo.result?.promo.code ?? "" })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
