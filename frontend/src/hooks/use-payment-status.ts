"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { apiFetch } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentInfo {
  state: string;
  priceCents: number;
  currency: string;
  capturedAt: string | null;
  failureReason: string | null;
}

export interface DispatchInfo {
  state: string;
  providerRef: string | null;
  submittedAt: string | null;
  trackingAvailable: boolean;
  lastCheckedAt: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_STATES = ["captured", "failed", "cancelled", "refunded"];

export const PAYMENT_SUCCESS_STATES = ["authorized", "captured"];
export const PAYMENT_FAILURE_STATES = ["failed", "cancelled"];
// "refunded" is terminal (stops polling) but shown as success on the
// confirmation page — a refund means payment was captured then reversed.

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Polls GET /drafts/:id/payment until a terminal state is reached. */
export function usePaymentStatus(draftId: string) {
  return useQuery({
    queryKey: queryKeys.payment(draftId),
    queryFn: () =>
      apiFetch<{ payment: PaymentInfo }>(`/v1/drafts/${draftId}/payment`).then(
        (r) => r.payment,
      ),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state && TERMINAL_STATES.includes(state)) return false;
      return 3000;
    },
  });
}

/** Fetches dispatch status; gracefully handles 404 (dispatch not yet created). */
export function useDispatchInfo(draftId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dispatch(draftId),
    queryFn: () =>
      apiFetch<{ dispatch: DispatchInfo }>(`/v1/drafts/${draftId}/dispatch`).then(
        (r) => r.dispatch,
      ),
    enabled,
    retry: (count, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return count < 2;
    },
    refetchInterval: 30_000,
  });
}
