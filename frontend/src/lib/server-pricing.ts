import "server-only";
import { PublicPricingResponseSchema } from "@episto/shared";

export interface ServicePriceBand {
  /** Real total a customer pays for a standard letter (postage + service). */
  lowPrice: string;
  /** Real total for a registered letter. */
  highPrice: string;
  currency: string;
}

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Read the postage-inclusive price band from the backend's cached public
 * pricing snapshot for use in structured data. This reads the stored ePost
 * rate matrix (the same multi-day-cached source the pricing pages use) — it
 * never calls ePost per request. Best-effort: on any failure it returns null
 * and callers simply omit the price, so a stale or wrong number is never
 * advertised and SSR is never blocked.
 */
export async function getServicePriceBand(): Promise<ServicePriceBand | null> {
  const base = process.env.API_URL ?? "http://localhost:4000";
  try {
    const response = await fetch(`${base}/api/v1/pricing`, {
      // Cache alongside the multi-day rate matrix; refresh hourly at most.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;

    const parsed = PublicPricingResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const { standard, registered } = parsed.data;
    return {
      lowPrice: centsToDecimalString(standard.totalCents),
      highPrice: centsToDecimalString(registered.totalCents),
      currency: standard.currency,
    };
  } catch {
    return null;
  }
}
