import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, pk, ts } from "./helpers.js";

/**
 * `sending` is a worker's claim on the row, not a state anyone waits in: it is
 * held for the duration of one provider call and exists so that a redelivered
 * BullMQ job cannot send the same email a second time.
 */
export type EmailOutboxStatus = "pending" | "sending" | "sent" | "failed";

/**
 * Every transactional email we have promised to send.
 *
 * A BullMQ job is an attempt; this row is the promise. The row is written
 * first, so an email that Redis loses — or that exhausts its retries against a
 * provider outage — is still visible in Postgres instead of vanishing. That
 * matters most for `dispatch-accepted`, which carries the customer's only link
 * to the letter they paid for.
 *
 * `dedupeKey` is the identity of the email as a piece of news
 * ("refund-confirmed for this Stripe refund"), and doubles as the BullMQ job
 * id. The unique constraint, not the queue, is what makes a double send
 * impossible: a completed job leaves Redis within a day, this row does not.
 */
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: pk(),
    dedupeKey: text("dedupe_key").notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    locale: text("locale").notNull(),
    /** Order reference or draft id — how an operator finds the affected order. */
    reference: text("reference"),
    /**
     * Nulled once the row is `sent`. The payload carries the recipient's
     * address, the body of their mail and — for receipts — a base64 PDF, none
     * of which is worth keeping once there is nothing left to re-drive. What
     * remains is a dedupe tombstone, not a copy of the customer's mail.
     */
    payload: jsonb("payload"),
    status: text("status").$type<EmailOutboxStatus>().default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    createdAt: createdAt(),
    lastAttemptedAt: ts("last_attempted_at"),
    sentAt: ts("sent_at"),
  },
  (table) => ({
    dedupeKeyUnique: unique("email_outbox_dedupe_key_unique").on(table.dedupeKey),
    recipientIdx: index("email_outbox_recipient_idx").on(
      table.recipient,
      table.createdAt,
    ),
    /**
     * Mirrors the sweep's eligibility predicate exactly. The old index was on
     * `created_at`, but the sweep orders its window by
     * `COALESCE(last_attempted_at, created_at)` — a re-driven row's clock
     * restarts — so the index could not serve the query it was built for.
     */
    pendingIdx: index("email_outbox_pending_idx")
      .on(sql`COALESCE(last_attempted_at, created_at)`)
      .where(sql`status IN ('pending', 'sending')`),
    /**
     * The constraint the SQL migration has always created. Declaring it here
     * too keeps `drizzle-kit generate` from proposing to add it on the next
     * unrelated schema change.
     */
    statusCheck: check(
      "email_outbox_status_check",
      sql`status IN ('pending', 'sending', 'sent', 'failed')`,
    ),
  }),
);
