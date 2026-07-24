import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, pk } from "./helpers.js";
import { paymentAttempts } from "./payments.js";

/**
 * Swiss VAT receipts. One immutable receipt per captured payment attempt.
 *
 * Prices are VAT-inclusive at 8.1% (`vatRateBp` = 810 basis points). The PDF is
 * stored in object storage at `storageKey` and referenced only by this table —
 * deliberately NOT as a `file_assets` row — so it survives the content/PDF
 * retention cleanup indefinitely for accounting/audit purposes.
 */
export const receipts = pgTable(
  "receipts",
  {
    id: pk(),
    paymentAttemptId: uuid("payment_attempt_id")
      .notNull()
      .unique()
      .references(() => paymentAttempts.id),
    // Human-facing sequential number, e.g. "EP-R-000042".
    receiptNumber: text("receipt_number").notNull().unique(),
    netCents: integer("net_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    // VAT rate in basis points (810 = 8.1%).
    vatRateBp: integer("vat_rate_bp").notNull().default(810),
    currency: text("currency").notNull().default("CHF"),
    discountCents: integer("discount_cents").notNull().default(0),
    promoCode: text("promo_code"),
    deliveryType: text("delivery_type"),
    orderRef: text("order_ref").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    paymentAttemptIdIdx: index("receipts_payment_attempt_id_idx").on(
      table.paymentAttemptId,
    ),
  }),
);
