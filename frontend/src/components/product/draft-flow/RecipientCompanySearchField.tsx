"use client";

import type { RecipientCompanySearchResultType } from "@episto/shared";
import { Loader2, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CompanySearchResults } from "./company-search-results";

interface RecipientCompanySearchFieldProps {
  companyName: string;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  areResultsVisible: boolean;
  results: RecipientCompanySearchResultType[];
  shouldShowResults: boolean;
  onChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSelect: (result: RecipientCompanySearchResultType) => void;
}

function resizeTextarea(event: FormEvent<HTMLTextAreaElement>) {
  const target = event.currentTarget;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

export function RecipientCompanySearchField({
  companyName,
  isLoading,
  isFetching,
  error,
  areResultsVisible,
  results,
  shouldShowResults,
  onChange,
  onFocusChange,
  onSelect,
}: RecipientCompanySearchFieldProps) {
  const t = useTranslations("draft");

  return (
    <>
      <div className="relative">
        <textarea
          name="recipientCompanySearch"
          autoComplete="organization"
          value={companyName}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onInput={resizeTextarea}
          placeholder={t("searchCompanyPlaceholder")}
          rows={1}
          className="app-form-control w-full resize-none overflow-hidden bg-transparent pr-8 font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {isFetching ? (
          <Loader2 className="absolute right-0 top-1 h-5 w-5 animate-spin text-zinc-300 dark:text-zinc-500" />
        ) : (
          <Search className="absolute right-0 top-1 h-5 w-5 text-zinc-300 dark:text-zinc-600" />
        )}
      </div>

      {shouldShowResults ? (
        <CompanySearchResults
          results={results}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          areResultsVisible={areResultsVisible}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}
