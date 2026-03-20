import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { apiFetch } from "../lib/api.js";

/**
 * Pricing data returned by the backend pricing endpoint.
 */
export interface PricingTier {
  totalCents: number;
  displayPrice: string;
  currency: "CHF";
}

export interface PricingResponse {
  standard: PricingTier;
  registered: PricingTier;
}

/**
 * Fetch canonical pricing from the backend.
 *
 * Prices are config-driven — the frontend never hardcodes amounts.
 * This hook provides display prices for review, checkout, and marketing pages.
 *
 * Data is treated as stable (5-minute stale time) since pricing
 * only changes with a backend redeploy.
 */
export function usePricing() {
  return useQuery<PricingResponse>({
    queryKey: queryKeys.pricing(),
    queryFn: () => apiFetch<PricingResponse>("/v1/pricing"),
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
