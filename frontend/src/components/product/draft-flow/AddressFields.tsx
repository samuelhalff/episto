"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AddressFieldsProps {
  namePrefix: "sender" | "recipient";
  addressLine1: string;
  postalCode: string;
  city: string;
  onAddressLine1Change: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  isResolvingSelection?: boolean;
  pendingSelectionLabel?: string | null;
  onFocusChange?: (focused: boolean) => void;
}

export function AddressFields({
  namePrefix,
  addressLine1,
  postalCode,
  city,
  onAddressLine1Change,
  onPostalCodeChange,
  onCityChange,
  isResolvingSelection = false,
  pendingSelectionLabel = null,
  onFocusChange,
}: AddressFieldsProps) {
  const t = useTranslations("draft");

  if (isResolvingSelection) {
    return (
      <div
        aria-busy="true"
        className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3"
      >
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("addressFieldsLoadingSelection")}</span>
        </div>
        {pendingSelectionLabel ? (
          <p className="mt-1 break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {pendingSelectionLabel}
          </p>
        ) : null}
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-10 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] animate-pulse" />
          </div>
          <div className="flex gap-4">
            <div className="w-24 space-y-2">
              <div className="h-3 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-10 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-10 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <div className="text-[11px] font-semibold tracking-normal text-zinc-400">
          {t("streetAddress")}
        </div>
        <input
          name={`${namePrefix}AddressLine1`}
          autoComplete="address-line1"
          value={addressLine1}
          onChange={(event) => onAddressLine1Change(event.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={t("streetPlaceholder")}
          className="app-form-control w-full border-b border-zinc-100 bg-transparent pb-1 font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
        />
      </div>
      <div className="flex gap-4">
        <div className="w-24 space-y-1">
          <div className="text-[11px] font-semibold tracking-normal text-zinc-400">
            {t("zipCode")}
          </div>
          <input
            name={`${namePrefix}PostalCode`}
            autoComplete="postal-code"
            inputMode="numeric"
            value={postalCode}
            onChange={(event) => onPostalCodeChange(event.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={t("zipPlaceholder")}
            className="app-form-control w-full border-b border-zinc-100 bg-transparent pb-1 font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-[11px] font-semibold tracking-normal text-zinc-400">
            {t("cityLabel")}
          </div>
          <input
            name={`${namePrefix}City`}
            autoComplete="address-level2"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={t("cityPlaceholder")}
            className="app-form-control w-full border-b border-zinc-100 bg-transparent pb-1 font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>
    </>
  );
}
