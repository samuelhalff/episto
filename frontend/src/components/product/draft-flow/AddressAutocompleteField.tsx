"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AddressSearchResultType } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";

import { useAddressDetails, useAddressSearch } from "../../../hooks/use-api";
import { getApiErrorUserMessage } from "../../../lib/api";

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
  onFocusChange?: (focused: boolean) => void;
}

export function AddressAutocompleteField({
  draftId,
  inputName,
  currentAddress,
  onResolvedAddress,
  onFocusChange,
}: AddressAutocompleteFieldProps) {
  const t = useTranslations("draft");
  const [draftQuery, setDraftQuery] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AddressSearchResultType | null>(null);
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

  const isLoading =
    addressSearch.isLoading ||
    addressSearch.isFetching ||
    addressDetails.isLoading ||
    addressDetails.isFetching;
  const errorMessage =
    getApiErrorUserMessage(addressSearch.error) ??
    getApiErrorUserMessage(addressDetails.error) ??
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

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {t("addressSearchLabel")}
        </div>
        <div className="relative" aria-busy={isLoading}>
          <input
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

      <p className="text-sm text-zinc-500 dark:text-zinc-300">{t("addressSearchHint")}</p>

      {errorMessage ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {errorMessage || t("addressSearchUnavailable")}
        </p>
      ) : null}

      {shouldShowNoResults ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-300">
          {t("addressSearchNoResults")}
        </p>
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
