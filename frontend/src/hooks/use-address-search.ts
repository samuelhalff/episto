"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AddressSearchResponseType } from "@episto/shared";

import { apiFetch } from "../lib/api";

export function useAddressSearch(draftId: string, query: string, enabled: boolean) {
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  return useQuery({
    queryKey: ["drafts", draftId, "address-search", debouncedQuery] as const,
    queryFn: () =>
      apiFetch<AddressSearchResponseType>(
        `/v1/drafts/${draftId}/address-search?query=${encodeURIComponent(debouncedQuery)}`,
      ).then((response) => response.results),
    enabled: enabled && debouncedQuery.length >= 3,
    staleTime: 30_000,
  });
}
