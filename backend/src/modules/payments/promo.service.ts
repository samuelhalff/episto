import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { validationError } from "../../shared/errors/index.js";

export interface AppliedPromo {
  promoCodeId: string;
  code: string;
  kind: "free" | "percent" | "fixed";
  /** Discount actually applied, in cents (0..baseTotalCents). */
  discountCents: number;
  /** Charged total after the discount (0..baseTotalCents). */
  finalCents: number;
}

/** Normalise a user-entered code: trim + uppercase. */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

function computeDiscountCents(
  kind: "free" | "percent" | "fixed",
  value: number,
  baseTotalCents: number,
): number {
  if (kind === "free") return baseTotalCents;
  if (kind === "percent") {
    const pct = Math.max(0, Math.min(100, value));
    return Math.min(baseTotalCents, Math.round((baseTotalCents * pct) / 100));
  }
  // fixed
  return Math.min(baseTotalCents, Math.max(0, value));
}

/**
 * Validate a promo code and compute the discounted total. Read-only: it does NOT
 * consume a redemption (call recordPromoRedemption once the order is actually
 * created). Throws a user-facing validationError for an invalid/expired/used-up
 * code. Never returns a negative or above-base total.
 */
export async function applyPromoToTotal(
  db: Db,
  input: { code: string; baseTotalCents: number },
): Promise<AppliedPromo> {
  const code = normalizePromoCode(input.code);
  if (!code) {
    throw validationError("Enter a promo code.");
  }

  const [promo] = await db
    .select()
    .from(schema.promoCodes)
    .where(eq(schema.promoCodes.code, code))
    .limit(1);

  const invalid = () =>
    validationError("This promo code is not valid.", [
      { field: "promoCode", message: "Invalid or expired code" },
    ]);

  if (!promo || !promo.active) throw invalid();
  if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) throw invalid();
  if (promo.maxRedemptions !== null && promo.redeemedCount >= promo.maxRedemptions) {
    throw validationError("This promo code has reached its limit.", [
      { field: "promoCode", message: "Code fully redeemed" },
    ]);
  }

  const discountCents = computeDiscountCents(
    promo.kind,
    promo.value,
    input.baseTotalCents,
  );
  return {
    promoCodeId: promo.id,
    code: promo.code,
    kind: promo.kind,
    discountCents,
    finalCents: Math.max(0, input.baseTotalCents - discountCents),
  };
}

/**
 * Atomically consume one redemption, re-checking the cap to prevent races from
 * exceeding maxRedemptions. Returns true if consumed, false if the cap was hit
 * concurrently (caller should reject the free/discount in that case).
 */
export async function recordPromoRedemption(
  db: Db,
  promoCodeId: string,
): Promise<boolean> {
  const rows = await db
    .update(schema.promoCodes)
    .set({
      redeemedCount: sql`${schema.promoCodes.redeemedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.promoCodes.id, promoCodeId),
        eq(schema.promoCodes.active, true),
        sql`(${schema.promoCodes.maxRedemptions} IS NULL OR ${schema.promoCodes.redeemedCount} < ${schema.promoCodes.maxRedemptions})`,
      ),
    )
    .returning({ id: schema.promoCodes.id });
  return rows.length > 0;
}
