"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecipientCompanySearchResponseType } from "@episto/shared";

import { apiFetch } from "../lib/api";

export function useRecipientCompanySearch(
  draftId: string,
  query: string,
  enabled: boolean,
) {
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  return useQuery({
    queryKey: ["drafts", draftId, "recipient-company-search", debouncedQuery] as const,
    queryFn: () =>
      apiFetch<RecipientCompanySearchResponseType>(
        `/v1/drafts/${draftId}/recipient/company-search?query=${encodeURIComponent(debouncedQuery)}`,
      ).then((response) => response.results),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });
}
