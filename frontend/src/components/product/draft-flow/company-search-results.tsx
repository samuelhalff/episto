"use client";

import type { RecipientCompanySearchResultType } from "@episto/shared";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

interface CompanySearchResultsProps {
  results: RecipientCompanySearchResultType[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  areResultsVisible: boolean;
  onSelect: (result: RecipientCompanySearchResultType) => void;
}

/**
 * Displays Zefix company search results with loading shimmer, error state,
 * and staggered entry animation. Extracted from RecipientStep for clarity.
 */
export function CompanySearchResults({
  results,
  isLoading,
  isFetching,
  error,
  areResultsVisible,
  onSelect,
}: CompanySearchResultsProps) {
  const t = useTranslations("draft");

  return (
    <div className="pl-0 sm:pl-16">
      <div
        aria-busy={isLoading || isFetching}
        className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3"
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {t("officialCompanySearch")}
        </div>

        {isLoading || isFetching ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("searchingCompanies")}</span>
            </div>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-3"
              >
                <div className="animate-shimmer space-y-2">
                  <div className="h-4 w-2/3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-1/2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t("companySearchUnavailable")}
          </p>
        ) : null}

        {!isLoading && !isFetching && !error && results.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            {t("companySearchNoResults")}
          </p>
        ) : null}

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                onClick={() => onSelect(result)}
                className={`flex w-full min-w-0 flex-col items-start gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-2 text-left transition-[opacity,transform,border-color,background-color,box-shadow] duration-300 ease-out hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-sm dark:hover:bg-amber-400/10 ${
                  areResultsVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                } sm:flex-row sm:items-start sm:justify-between sm:gap-3`}
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {result.name}
                  </span>
                  <span className="block break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {result.legalSeat
                      ? t("companySearchSeat", { seat: result.legalSeat })
                      : t("companySearchManualAddressHint")}
                  </span>
                </span>
                <span className="max-w-full shrink-0 break-all text-xs font-medium text-zinc-400 dark:text-zinc-500 sm:max-w-[8rem] sm:text-right">
                  {result.registryUid ?? result.registryId ?? "Zefix"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
