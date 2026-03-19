import { env } from "../../shared/config/index.js";

/**
 * Pricing service — computes the checkout price for a letter.
 *
 * MVP pricing (locked):
 * - Standard letter: PRICE_STANDARD_CENTS (default 490 = CHF 4.90)
 * - Registered letter: PRICE_REGISTERED_CENTS (default 890 = CHF 8.90)
 * - No page surcharge at launch
 * - No attachment surcharge at launch
 * - No coupon/promotion at launch
 *
 * All amounts are integer cents in CHF.
 */

export interface PriceBreakdown {
  baseCents: number;
  deliverySurchargeCents: number;
  pageSurchargeCents: number;
  attachmentSurchargeCents: number;
  totalCents: number;
}

export type DeliveryType = "standard" | "registered";

export function calculatePrice(deliveryType: DeliveryType): PriceBreakdown {
  const config = env();

  const baseCents =
    deliveryType === "registered"
      ? config.PRICE_REGISTERED_CENTS
      : config.PRICE_STANDARD_CENTS;

  // MVP: no surcharges enabled
  const deliverySurchargeCents = 0;
  const pageSurchargeCents = 0;
  const attachmentSurchargeCents = 0;

  const totalCents =
    baseCents +
    deliverySurchargeCents +
    pageSurchargeCents +
    attachmentSurchargeCents;

  return {
    baseCents,
    deliverySurchargeCents,
    pageSurchargeCents,
    attachmentSurchargeCents,
    totalCents,
  };
}

/**
 * Format an amount in cents as a CHF string for user display.
 */
export function formatCHF(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `CHF ${whole}.${frac.toString().padStart(2, "0")}`;
}
