"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { apiFetch } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingBreakdown {
  priceCents: number;
  currency: string;
  deliveryType: string;
}

interface PaymentState {
  state: string;
  paymentAttemptId: string | null;
}

interface CheckoutResponse {
  clientSecret: string;
  paymentAttemptId: string;
  priceCents: number;
  currency: string;
}

interface PaymentResponse {
  payment: {
    state: string;
    paymentAttemptId: string | null;
    amountCents: number;
    currency: string;
  };
}

export interface UseCheckoutReturn {
  pricing: PricingBreakdown | null;
  paymentState: PaymentState | null;
  clientSecret: string | null;
  /** Initiates a payment intent; sets clientSecret on success */
  createPaymentIntent: (email: string) => Promise<void>;
  isProcessing: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCheckout(draftId: string): UseCheckoutReturn {
  const queryClient = useQueryClient();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Payment state — always fresh from server (no stale cache)
  const paymentQuery = useQuery({
    queryKey: queryKeys.payment(draftId),
    queryFn: () =>
      apiFetch<PaymentResponse>(`/v1/drafts/${draftId}/payment`).then((r) => r.payment),
    staleTime: 0,
    enabled: Boolean(draftId),
  });

  const checkoutMutation = useMutation({
    mutationFn: (email: string) =>
      apiFetch<CheckoutResponse>(`/v1/drafts/${draftId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      // Invalidate payment state so UI reflects the newly pending payment
      void queryClient.invalidateQueries({ queryKey: queryKeys.payment(draftId) });
    },
  });

  const createPaymentIntent = useCallback(
    async (email: string): Promise<void> => {
      await checkoutMutation.mutateAsync(email);
    },
    [checkoutMutation],
  );

  const paymentData = paymentQuery.data;

  const pricing: PricingBreakdown | null = paymentData
    ? {
        priceCents: (paymentData as { amountCents: number }).amountCents,
        currency: (paymentData as { currency: string }).currency ?? "CHF",
        deliveryType: "standard",
      }
    : null;

  const paymentState: PaymentState | null = paymentData
    ? {
        state: paymentData.state,
        paymentAttemptId: paymentData.paymentAttemptId,
      }
    : null;

  return {
    pricing,
    paymentState,
    clientSecret,
    createPaymentIntent,
    isProcessing: checkoutMutation.isPending,
    error: checkoutMutation.error ?? paymentQuery.error ?? null,
  };
}
