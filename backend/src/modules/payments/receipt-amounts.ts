/**
 * Swiss VAT amount computation for receipts.
 *
 * All Episto prices are VAT-INCLUSIVE at the standard Swiss rate of 8.1%
 * (810 basis points). Given a gross, VAT-inclusive total in cents, we back out
 * the VAT component and the net (pre-VAT) amount:
 *
 *   vat = round(total * 0.081 / 1.081)
 *   net = total - vat
 *
 * A zero total yields zero net and zero VAT (free-promo orders).
 */
export const VAT_RATE_BP = 810;

const VAT_MULTIPLIER = 0.081 / 1.081;

export interface ReceiptAmounts {
  netCents: number;
  vatCents: number;
  totalCents: number;
  vatRateBp: number;
}

export function computeReceiptAmounts(
  totalCents: number,
  discountCents = 0,
): ReceiptAmounts {
  void discountCents;
  if (totalCents <= 0) {
    return {
      netCents: 0,
      vatCents: 0,
      totalCents: Math.max(0, totalCents),
      vatRateBp: VAT_RATE_BP,
    };
  }

  const vatCents = Math.round(totalCents * VAT_MULTIPLIER);
  const netCents = totalCents - vatCents;

  return { netCents, vatCents, totalCents, vatRateBp: VAT_RATE_BP };
}

/**
 * Format a receipt sequence number as a zero-padded, prefixed string, e.g.
 * `42` → `"EP-R-000042"`.
 */
export function formatReceiptNumber(sequence: number): string {
  return `EP-R-${String(sequence).padStart(6, "0")}`;
}
