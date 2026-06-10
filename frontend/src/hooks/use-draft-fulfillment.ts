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
    refetchInterval: (query) => {
      const nextAction = query.state.data?.nextAction;
      if (!nextAction || nextAction === "view_confirmation") {
        return false;
      }

      return 3000;
    },
  });
}
