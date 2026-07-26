import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";
import { paymentAttempts } from "./payments.js";

/**
 * One lifecycle row per Stripe Refund (migration 0018). A payment can have many
 * partial refunds; each is dated by its own successful-refund time. Amount,
 * currency, charge and Stripe creation time are immutable; status/fee/balance
 * fields are refreshed on each sync. `refund_net_cents + refund_vat_cents`
 * always equals `amount_cents` (VAT allocated cumulatively across partials).
 */
export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: pk(),
    paymentAttemptId: uuid("payment_attempt_id")
      .notNull()
      .references(() => paymentAttempts.id),
    stripeRefundId: text("stripe_refund_id").notNull().unique(),
    stripeChargeId: text("stripe_charge_id").notNull(),
    stripeBalanceTransactionId: text("stripe_balance_transaction_id").unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    refundNetCents: integer("refund_net_cents"),
    refundVatCents: integer("refund_vat_cents"),
    stripeFeeCents: integer("stripe_fee_cents"),
    reason: text("reason"),
    failureReason: text("failure_reason"),
    initiatedBy: text("initiated_by"),
    stripeCreatedAt: ts("stripe_created_at").notNull(),
    refundedAt: ts("refunded_at"),
    failedAt: ts("failed_at"),
    lastSyncedAt: ts("last_synced_at").defaultNow().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    paymentAttemptIdIdx: index("payment_refunds_payment_attempt_id_idx").on(
      table.paymentAttemptId,
    ),
    refundedAtIdx: index("payment_refunds_refunded_at_idx").on(table.refundedAt),
    statusIdx: index("payment_refunds_status_idx").on(table.status),
  }),
);
