import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { updatedAt } from "./helpers.js";

/**
 * Manual monthly fixed operating costs (opex) for the admin P&L bottom line.
 *
 * One row per calendar month keyed by `year_month` ("YYYY-MM"). Unlike the
 * frozen per-order cost basis (postage, Stripe fees), this is a mutable admin
 * INPUT — it simply lets the Financials page reach a real operating result.
 * Amounts are CHF cents.
 */
export const monthlyFixedCosts = pgTable("monthly_fixed_costs", {
  // Calendar month, e.g. "2026-07".
  yearMonth: text("year_month").primaryKey(),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  updatedAt: updatedAt(),
});
