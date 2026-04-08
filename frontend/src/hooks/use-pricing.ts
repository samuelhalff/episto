import { useQuery } from "@tanstack/react-query";
import {
  PublicPricingResponseSchema,
  queryKeys,
  type PublicPricingResponse,
} from "@swiss-mail/shared";
import { apiFetch } from "../lib/api";

/**
 * Fetch canonical pricing from the backend.
 *
 * The frontend never hardcodes prices. Marketing pages receive matrix-backed
 * public reference pricing from the same stored provider snapshot used by the
 * app, while checkout still relies on the live draft-specific provider quote.
 *
 * The query stays warm for 5 minutes because pricing is served from stored
 * synced data rather than recalculated from the provider on every page view.
 */
export function usePricing() {
  return useQuery<PublicPricingResponse>({
    queryKey: queryKeys.pricing(),
    queryFn: async () => {
      const response = await apiFetch<PublicPricingResponse>("/v1/pricing");
      return PublicPricingResponseSchema.parse(response);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Format an amount in cents as a CHF display string.
 * Used as a fallback when the backend display string is unavailable.
 */
export function formatCentsAsCHF(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `CHF ${whole}.${frac.toString().padStart(2, "0")}`;
}
