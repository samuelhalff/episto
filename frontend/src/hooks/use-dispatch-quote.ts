"use client";

import { useQuery } from "@tanstack/react-query";
import type { DraftDispatchQuoteResponse } from "@swiss-mail/shared";
import { queryKeys } from "@swiss-mail/shared";

import { apiFetch } from "../lib/api";

export function useDispatchQuote(draftId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.draftQuote(draftId),
    queryFn: () =>
      apiFetch<DraftDispatchQuoteResponse>(`/v1/drafts/${draftId}/quote`).then(
        (response) => response.quote,
      ),
    enabled: Boolean(draftId) && enabled,
    staleTime: 0,
  });
}
