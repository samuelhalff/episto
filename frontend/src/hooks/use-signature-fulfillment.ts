"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useSignatureEligibility(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{
        eligibility: DraftFulfillmentStatusResponse["fulfillment"]["eligibility"];
      }>(`/v1/drafts/${draftId}/signature/eligibility`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.draftFulfillment(draftId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.draft(draftId) });
    },
  });
}

export function useCreateSignatureSession(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { returnUrl: string }) =>
      apiFetch<{
        signatureSession: DraftFulfillmentStatusResponse["fulfillment"]["signatureSession"];
        handoffUrl: string | null;
      }>(`/v1/drafts/${draftId}/signature/session`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.draftFulfillment(draftId),
      });
    },
  });
}

export function useTriggerMockSignatureOutcome(
  draftId: string,
  providerSessionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (outcome: "completed" | "failed" | "expired" | "in_progress") =>
      apiFetch(`/v1/drafts/${draftId}/signature/mock/${providerSessionId}/callback`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.draftFulfillment(draftId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payment(draftId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dispatch(draftId) });
    },
  });
}
