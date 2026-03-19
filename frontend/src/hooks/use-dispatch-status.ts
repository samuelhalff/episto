"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

interface DispatchStatus {
  draftId: string;
  dispatchAttemptId: string | null;
  state: string;
  providerRef: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  trackingAvailable: boolean;
  lastCheckedAt: string | null;
}

function dispatchOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "dispatch"] as const,
    queryFn: () =>
      apiFetch<{ dispatch: DispatchStatus }>(`/v1/drafts/${draftId}/dispatch`),
    staleTime: 30_000,
  });
}

export function useDispatchStatus(draftId: string) {
  return useQuery(dispatchOptions(draftId));
}
