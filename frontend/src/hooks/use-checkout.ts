"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

export function useCheckout(draftId: string) {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      apiFetch<{ clientSecret: string | null; paymentAttemptId: string; priceCents: number; currency: string }>(
        `/v1/drafts/${draftId}/checkout`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
  });
}

function paymentOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "payment"] as const,
    queryFn: () =>
      apiFetch<{ payment: { state: string; priceCents: number | null } }>(
        `/v1/drafts/${draftId}/payment`,
      ),
    staleTime: 10_000,
  });
}

export function usePayment(draftId: string) {
  return useQuery(paymentOptions(draftId));
}
