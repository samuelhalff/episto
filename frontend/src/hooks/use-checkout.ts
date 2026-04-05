"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, type DraftDispatchQuote } from "@swiss-mail/shared";
import { apiFetch, isApiErrorWithStatus } from "../lib/api";
import { useDispatchQuote } from "./use-dispatch-quote";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingBreakdown {
  totalCents: number;
  providerQuotedCents: number;
  swissMailMarkupCents: number;
  currency: "CHF";
  deliveryType: string;
  providerQuoteReference: string | null;
  attachmentHandling: "excluded" | "single_hint" | "unverified";
  lineItems: Array<{
    label: string;
    amountCents: number;
    source: "provider" | "swiss_mail";
  }>;
}

interface PaymentState {
  state: string;
  paymentAttemptId: string | null;
}

interface CheckoutResponse {
  clientSecret: string | null;
  paymentAttemptId: string;
  priceCents: number;
  currency: string;
  quote: Omit<DraftDispatchQuote, "draftId" | "snapshotId">;
}

interface PaymentResponse {
  payment: {
    state: string;
    paymentAttemptId: string | null;
    priceCents: number;
    currency: string;
    breakdown: Omit<DraftDispatchQuote, "draftId" | "snapshotId" | "currency">;
  };
}

export interface UseCheckoutReturn {
  pricing: PricingBreakdown | null;
  paymentState: PaymentState | null;
  clientSecret: string | null;
  /** Initiates or resumes a payment intent and returns the latest checkout payload. */
  createPaymentIntent: (email: string) => Promise<CheckoutResponse>;
  isProcessing: boolean;
  isBootstrapping: boolean;
  isRefreshing: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCheckout(
  draftId: string,
  options?: { quoteEnabled?: boolean },
): UseCheckoutReturn {
  const queryClient = useQueryClient();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const quoteQuery = useDispatchQuote(draftId, options?.quoteEnabled ?? true);

  // Payment state — always fresh from server (no stale cache)
  const paymentQuery = useQuery({
    queryKey: queryKeys.payment(draftId),
    queryFn: async () => {
      try {
        return await apiFetch<PaymentResponse>(`/v1/drafts/${draftId}/payment`).then(
          (r) => r.payment,
        );
      } catch (error) {
        if (isApiErrorWithStatus(error, 404)) {
          return null;
        }

        throw error;
      }
    },
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
    async (email: string): Promise<CheckoutResponse> =>
      checkoutMutation.mutateAsync(email),
    [checkoutMutation],
  );

  const paymentData = paymentQuery.data;

  const pricing: PricingBreakdown | null = paymentData?.breakdown
    ? {
        ...paymentData.breakdown,
        totalCents: paymentData.priceCents,
        currency: "CHF",
      }
    : quoteQuery.data
      ? {
          totalCents: quoteQuery.data.totalCents,
          providerQuotedCents: quoteQuery.data.providerQuotedCents,
          swissMailMarkupCents: quoteQuery.data.swissMailMarkupCents,
          currency: quoteQuery.data.currency,
          deliveryType: quoteQuery.data.deliveryType,
          providerQuoteReference: quoteQuery.data.providerQuoteReference,
          attachmentHandling: quoteQuery.data.attachmentHandling,
          lineItems: quoteQuery.data.lineItems,
        }
      : null;

  const paymentState: PaymentState | null = paymentData
    ? {
        state: paymentData.state,
        paymentAttemptId: paymentData.paymentAttemptId,
      }
    : null;
  const isBootstrapping =
    (paymentQuery.isLoading && !paymentQuery.data && !paymentQuery.error) ||
    (quoteQuery.isLoading && !quoteQuery.data && !quoteQuery.error);
  const isRefreshing =
    (paymentQuery.isFetching && Boolean(paymentQuery.data)) ||
    (quoteQuery.isFetching && Boolean(quoteQuery.data));

  return {
    pricing,
    paymentState,
    clientSecret,
    createPaymentIntent,
    isProcessing: checkoutMutation.isPending,
    isBootstrapping,
    isRefreshing,
    error: checkoutMutation.error ?? paymentQuery.error ?? quoteQuery.error ?? null,
  };
}
