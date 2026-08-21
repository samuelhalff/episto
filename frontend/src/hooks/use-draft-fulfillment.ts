"use client";

import { useQuery } from "@tanstack/react-query";
import type { DraftFulfillmentStatusResponse } from "@episto/shared";
import { queryKeys } from "@episto/shared";
import { apiFetch } from "../lib/api";

export function useDraftFulfillment(draftId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.draftFulfillment(draftId),
    queryFn: () =>
      apiFetch<DraftFulfillmentStatusResponse>(`/v1/drafts/${draftId}/fulfillment`).then(
        (response) => response.fulfillment,
      ),
    enabled: Boolean(draftId) && enabled,
    // Bounded retries so a persistently failing poll (e.g. a missing route)
    // settles into `isError` instead of spinning forever. The confirmation
    // page renders an explicit error/retry state once this errors out.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchInterval: (query) => {
      const nextAction = query.state.data?.nextAction;
      if (!nextAction || nextAction === "view_confirmation") {
        return false;
      }

      return 3000;
    },
  });
}
