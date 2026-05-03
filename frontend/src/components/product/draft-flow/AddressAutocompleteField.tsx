"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AddressSearchResultType } from "@episto/shared";
import { useTranslations } from "next-intl";
import { Loader2, MapPin, Search } from "lucide-react";

import { useAddressDetails, useAddressSearch } from "@/hooks/use-api";
import { getApiErrorCode, getApiErrorUserMessage } from "@/lib/api";

export interface AddressResolutionState {
  isResolving: boolean;
  requiresSelection: boolean;
  selectedLabel: string | null;
}

interface AddressAutocompleteFieldProps {
  draftId: string;
  inputName: string;
  currentAddress: {
    addressLine1: string;
    postalCode: string;
    city: string;
  };
  onResolvedAddress: (nextAddress: {
    addressLine1: string;
    postalCode: string;
    city: string;
  }) => void;
  onResolutionStateChange?: (state: AddressResolutionState) => void;
  onFocusChange?: (focused: boolean) => void;
}

export function AddressAutocompleteField({
  draftId,
  inputName,
  currentAddress,
  onResolvedAddress,
  onResolutionStateChange,
  onFocusChange,
}: AddressAutocompleteFieldProps) {
  const t = useTranslations("draft");
  const [draftQuery, setDraftQuery] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AddressSearchResultType | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastAppliedSuggestionIdRef = useRef<string | null>(null);

  const addressSummary = useMemo(() => {
    const street = currentAddress.addressLine1.trim();
    const locality = [currentAddress.postalCode.trim(), currentAddress.city.trim()]
      .filter(Boolean)
      .join(" ");

    return [street, locality].filter(Boolean).join(", ");
  }, [currentAddress.addressLine1, currentAddress.city, currentAddress.postalCode]);

  const query = hasUserInteracted ? draftQuery : addressSummary;

  const searchEnabled =
    hasUserInteracted && selectedSuggestion === null && query.trim().length >= 3;
  const addressSearch = useAddressSearch(draftId, query, searchEnabled);
  const addressDetails = useAddressDetails(
    draftId,
    selectedSuggestion?.id ?? "",
    Boolean(selectedSuggestion?.id),
  );
  const requiresSelection =
    hasUserInteracted && draftQuery.trim().length >= 3 && selectedSuggestion === null;
  const isResolvingSelection =
    Boolean(selectedSuggestion) &&
    !addressDetails.data &&
    (addressDetails.isLoading || addressDetails.isFetching);

  useEffect(() => {
    if (!selectedSuggestion || !addressDetails.data) {
      return;
    }

    if (lastAppliedSuggestionIdRef.current === selectedSuggestion.id) {
      return;
    }

    onResolvedAddress({
      addressLine1: addressDetails.data.addressLine1 ?? "",
      postalCode: addressDetails.data.postalCode ?? "",
      city: addressDetails.data.city ?? "",
    });
    lastAppliedSuggestionIdRef.current = selectedSuggestion.id;
  }, [addressDetails.data, onResolvedAddress, selectedSuggestion]);

  useEffect(() => {
    onResolutionStateChange?.({
      isResolving: isResolvingSelection,
      requiresSelection,
      selectedLabel: isResolvingSelection ? (selectedSuggestion?.label ?? null) : null,
    });
  }, [
    isResolvingSelection,
    onResolutionStateChange,
    requiresSelection,
    selectedSuggestion?.label,
  ]);

  const isLoading =
    addressSearch.isLoading ||
    addressSearch.isFetching ||
    addressDetails.isLoading ||
    addressDetails.isFetching;
  const addressErrorMessageOverrides = {
    byCode: {
      PROVIDER_OUTAGE: t("addressSearchUnavailable"),
    },
  } as const;
  const hasProviderOutage =
    getApiErrorCode(addressSearch.error) === "PROVIDER_OUTAGE" ||
    getApiErrorCode(addressDetails.error) === "PROVIDER_OUTAGE";
  const errorMessage =
    getApiErrorUserMessage(addressSearch.error, addressErrorMessageOverrides) ??
    getApiErrorUserMessage(addressDetails.error, addressErrorMessageOverrides) ??
    null;
  const results = addressSearch.data ?? [];
  const shouldShowResults =
    searchEnabled &&
    !addressSearch.isLoading &&
    !addressSearch.isFetching &&
    results.length > 0;
  const shouldShowNoResults =
    searchEnabled &&
    !addressSearch.isLoading &&
    !addressSearch.isFetching &&
    !addressSearch.error &&
    results.length === 0;
  const canClearQuery = query.trim().length > 0;

  const helperMessage =
    errorMessage ??
    (shouldShowNoResults
      ? t("addressSearchNoResults")
      : requiresSelection && !isLoading
        ? t("addressSearchSelectionRequired")
        : t("addressSearchHint"));
  const helperClassName = errorMessage
    ? "text-sm text-amber-700 dark:text-amber-300"
    : requiresSelection && !isLoading
      ? "text-sm text-amber-700 dark:text-amber-300"
      : "text-sm text-zinc-500 dark:text-zinc-300";

  function handleQueryChange(value: string) {
    setHasUserInteracted(true);
    setDraftQuery(value);

    if (selectedSuggestion && value.trim() !== selectedSuggestion.label) {
      setSelectedSuggestion(null);
      lastAppliedSuggestionIdRef.current = null;
    }
  }

  function handleSelectSuggestion(result: AddressSearchResultType) {
    setHasUserInteracted(true);
    setSelectedSuggestion(result);
    setDraftQuery(result.label);
    lastAppliedSuggestionIdRef.current = null;
  }

  function handleClearQuery() {
    setHasUserInteracted(true);
    setDraftQuery("");
    setSelectedSuggestion(null);
    lastAppliedSuggestionIdRef.current = null;
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("addressSearchLabel")}</span>
          </div>
          <button
            type="button"
            onClick={handleClearQuery}
            disabled={!canClearQuery}
            className="inline-flex min-h-8 shrink-0 items-center px-2 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {t("addressSearchClear")}
          </button>
        </div>
        <div className="relative" aria-busy={isLoading}>
          <input
            ref={inputRef}
            name={inputName}
            autoComplete="off"
            inputMode="search"
            spellCheck={false}
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={t("addressSearchPlaceholder")}
            className="app-form-control w-full border-b border-zinc-100 bg-transparent pb-1 pr-8 font-medium text-zinc-700 placeholder:text-zinc-300 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
          {isLoading ? (
            <Loader2 className="pointer-events-none absolute right-0 top-1 h-5 w-5 animate-spin text-zinc-300 dark:text-zinc-500" />
          ) : (
            <Search className="pointer-events-none absolute right-0 top-1 h-5 w-5 text-zinc-300 dark:text-zinc-600" />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className={helperClassName}>{helperMessage}</p>
        {!hasProviderOutage ? (
          <p className="text-[10px] leading-4 text-zinc-400 dark:text-zinc-500">
            {t("addressSearchSourceNote")}
          </p>
        ) : null}
      </div>

      {isResolvingSelection && selectedSuggestion ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3"
        >
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("addressSearchApplyingSelection")}</span>
          </div>
          <p className="mt-2 break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {selectedSuggestion.label}
          </p>
        </div>
      ) : null}

      {shouldShowResults ? (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {t("searchingAddresses")}
          </div>
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectSuggestion(result)}
                className="flex w-full min-w-0 flex-col items-start gap-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-sm dark:hover:bg-amber-400/10"
              >
                <span className="block break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {result.primaryText}
                </span>
                <span className="block break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {result.secondaryText ?? result.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
