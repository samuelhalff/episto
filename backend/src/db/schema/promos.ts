import { boolean, index, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

/**
 * Promo / discount codes.
 *
 * - `free`: makes the order free (total → 0).
 * - `percent`: reduces the total by `value`% (0–100).
 * - `fixed`: reduces the total by `value` cents (floored at 0).
 *
 * Redemptions are capped globally by `maxRedemptions` (null = unlimited) and
 * gated by `active` + `expiresAt`. The discount is always recomputed and
 * enforced server-side; the client only ever submits a code string.
 */
export const promoKindEnum = pgEnum("promo_kind", ["free", "percent", "fixed"]);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: pk(),
    // Stored normalised (uppercase, trimmed).
    code: text("code").notNull().unique(),
    kind: promoKindEnum("kind").notNull(),
    // percent: 0–100; fixed: cents; free: ignored.
    value: integer("value").notNull().default(0),
    maxRedemptions: integer("max_redemptions"),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    expiresAt: ts("expires_at"),
    active: boolean("active").notNull().default(true),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    codeIdx: index("promo_codes_code_idx").on(table.code),
  }),
);
