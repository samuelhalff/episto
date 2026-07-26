import { index, integer, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./auth.js";
import { draftLetters } from "./drafting.js";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

export const paymentStateEnum = pgEnum("payment_state", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    state: paymentStateEnum("state").default("pending").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeChargeId: text("stripe_charge_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("CHF").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    failureReason: text("failure_reason"),
    refundReason: text("refund_reason"),
    verifiedPhoneE164: text("verified_phone_e164"),
    phoneVerifiedAt: ts("phone_verified_at"),
    orderAccessTokenHash: text("order_access_token_hash").unique(),
    orderAccessTokenExpiresAt: ts("order_access_token_expires_at"),
    // Immutable capture attribution + actual Stripe charge fee (migration 0018).
    // Reports key off captured_at, never the mutable state/updated_at.
    capturedAt: ts("captured_at"),
    capturedAtSource: text("captured_at_source"),
    stripeBalanceTransactionId: text("stripe_balance_transaction_id"),
    stripeFeeCents: integer("stripe_fee_cents"),
    stripeFeeCurrency: text("stripe_fee_currency"),
    stripeFeeRecordedAt: ts("stripe_fee_recorded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    draftIdIdx: index("payment_attempts_draft_id_idx").on(table.draftId),
    sessionIdIdx: index("payment_attempts_session_id_idx").on(table.sessionId),
    stateIdx: index("payment_attempts_state_idx").on(table.state),
    orderTokenIdx: index("payment_attempts_order_token_idx").on(
      table.orderAccessTokenHash,
    ),
  }),
);
