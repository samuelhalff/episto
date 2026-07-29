import type { FastifyInstance, FastifyReply } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { enqueueTransactionalEmail, OUTBOX_MAX_ATTEMPTS } from "../email/email-outbox.js";
import { createLogger } from "../../shared/logging/index.js";

// ---------------------------------------------------------------------------
// Admin email outbox endpoints
// GET  /admin/email-outbox            — mail we owe a customer and have not sent
// POST /admin/email-outbox/:id/retry  — put a failed row back in the queue
//
// The outbox already records every email we promised; until now nothing read
// it. A `failed` row meant a customer never got their VAT receipt, or — worse —
// never got the order-access link that is their only route back to the letter
// they paid for, and the only trace was a log line that scrolled away hours
// ago. This is the operator's view of that silence.
//
// Guarded by requireAllowlistedAdminIp + requireAdmin on the parent adminRoutes.
// ---------------------------------------------------------------------------

const logger = createLogger("admin-email-outbox");

/**
 * How many attempts make a still-`pending` row worth an operator's attention.
 *
 * BullMQ gives each email job ten attempts spanning roughly four and a quarter
 * hours. A row past ten attempts has therefore burned a whole retry ladder
 * without landing — it is not a provider blipping, it is something that has
 * been failing all afternoon and is two thirds of the way to
 * OUTBOX_MAX_ATTEMPTS (30), where it is written off for good. Surfacing it here
 * is what gives the operator a chance to act *before* the row goes `failed` and
 * the customer's mail is abandoned.
 */
const ATTENTION_ATTEMPT_THRESHOLD = Math.floor(OUTBOX_MAX_ATTEMPTS / 3);

/**
 * A row needs attention when it has already been written off, or when it is
 * still being retried but has spent enough of its budget that no further retry
 * is likely to help. `sent` rows are the happy path and never appear.
 */
const needsAttentionPredicate = sql`
  status = 'failed'
  OR (status IN ('pending', 'sending') AND attempts >= ${ATTENTION_ATTEMPT_THRESHOLD})
`;

export interface EmailOutboxItem {
  id: string;
  recipient: string;
  template: string;
  locale: string;
  reference: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  lastAttemptedAt: string | null;
}

export interface EmailOutboxResponse {
  count: number;
  emails: EmailOutboxItem[];
  generatedAt: string;
}

/** Enough to see the whole problem during an outage without paging the admin. */
const LIST_LIMIT = 200;

/**
 * Deliberately no `payload`.
 *
 * The payload is the rendered email: the customer's address, the body of the
 * letter they wrote, and for receipts a base64 PDF of what they bought. An
 * operator triaging undelivered mail needs to know *that* it failed and *why* —
 * recipient, template, error — never what the customer said. Reading a
 * customer's letter is a deliberate, audited act elsewhere in this admin
 * (POST /admin/drafts/:id/view-content); it must not be a side effect of
 * opening a list page.
 */
async function listRowsNeedingAttention(): Promise<EmailOutboxItem[]> {
  const db = getDb();
  const rows = await db.execute<{
    id: string;
    recipient: string;
    template: string;
    locale: string;
    reference: string | null;
    status: string;
    attempts: number;
    last_error: string | null;
    created_at: Date;
    last_attempted_at: Date | null;
  }>(sql`
    SELECT id, recipient, template, locale, reference, status, attempts,
           last_error, created_at, last_attempted_at
    FROM email_outbox
    WHERE ${needsAttentionPredicate}
    ORDER BY COALESCE(last_attempted_at, created_at) DESC
    LIMIT ${LIST_LIMIT}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    recipient: row.recipient,
    template: row.template,
    locale: row.locale,
    reference: row.reference,
    status: row.status,
    attempts: Number(row.attempts),
    lastError: row.last_error,
    createdAt: new Date(row.created_at).toISOString(),
    lastAttemptedAt: row.last_attempted_at
      ? new Date(row.last_attempted_at).toISOString()
      : null,
  }));
}

/**
 * The count behind the admin health badge — same predicate as the list, so the
 * number an operator sees on the health page is exactly what the outbox page
 * will show them.
 */
export async function countEmailOutboxNeedingAttention(): Promise<number> {
  const db = getDb();
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM email_outbox WHERE ${needsAttentionPredicate}
  `);
  return Number(result.rows[0]?.count ?? 0);
}

interface RetryCandidate extends Record<string, unknown> {
  dedupe_key: string;
  payload: SendEmailJob | null;
  reference: string | null;
  status: string;
}

/** Why a retry was refused — each maps to something true about the row. */
const REFUSALS = {
  sent: {
    status: 409,
    code: "EMAIL_ALREADY_SENT",
    message:
      "This email was delivered. Re-sending it would put a second copy in the customer's inbox.",
  },
  in_flight: {
    status: 409,
    code: "EMAIL_NOT_FAILED",
    message:
      "This email is still being retried automatically. Only a failed email can be retried by hand.",
  },
  no_payload: {
    status: 409,
    code: "EMAIL_PAYLOAD_DISCARDED",
    message:
      "The rendered email was discarded, so there is nothing left to send. Re-trigger the underlying action instead.",
  },
} as const;

export async function adminEmailOutboxRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/email-outbox",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (_request, reply) => {
      try {
        const emails = await listRowsNeedingAttention();
        const response: EmailOutboxResponse = {
          count: emails.length,
          emails,
          generatedAt: new Date().toISOString(),
        };
        reply.status(200).send(response);
      } catch (err) {
        reply.status(500).send({
          error: {
            code: "EMAIL_OUTBOX_QUERY_FAILED",
            message:
              err instanceof Error ? err.message : "Failed to query the email outbox",
          },
        });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/admin/email-outbox/:id/retry",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      try {
        // One conditional UPDATE is the claim: only a `failed` row that still
        // has its payload can be revived, and reviving it is what makes it
        // eligible for the enqueue below. Two operators mashing the button
        // cannot both win — the second finds the row already `pending`.
        //
        // `attempts` goes back to zero on purpose. The row is past
        // OUTBOX_MAX_ATTEMPTS, and leaving the counter there would let the
        // stall sweep write the row off again a few hours later without a
        // single new attempt having been made. An operator retry is a fresh
        // budget; `last_error` is kept so the page still shows what went wrong
        // until the send either succeeds or fails anew.
        const revived = await db.execute<RetryCandidate>(sql`
          UPDATE email_outbox
          SET status = 'pending',
              attempts = 0,
              last_attempted_at = NOW()
          WHERE id = ${id}
            AND status = 'failed'
            AND payload IS NOT NULL
          RETURNING dedupe_key, payload, reference, status
        `);

        const row = revived.rows[0];
        if (!row?.payload) {
          await refuseRetry(db, id, reply);
          return;
        }

        // The old job is almost certainly still sitting in Redis' failed set
        // (`removeOnFail` keeps 5000), and BullMQ ignores an `add` for a job id
        // it already holds. Without this removal the retry button would report
        // success and enqueue nothing — exactly the silent no-op this endpoint
        // is supposed to end.
        await getQueue(QUEUE_NAMES.SEND_EMAIL)
          .remove(row.dedupe_key)
          .catch((err: unknown) => {
            logger.warn(
              {
                outboxId: id,
                err: err instanceof Error ? err.message : "Unknown error",
              },
              "Could not remove the stale email job before an operator retry",
            );
          });

        // Reuse the one door every transactional email goes through. The row
        // exists, so this takes the conflict path: it sees a `pending` row with
        // a payload and puts its job back under the original dedupe key. It
        // returns false — the email was promised by the original call, not this
        // one — which is why the response below reports the row state instead.
        await enqueueTransactionalEmail(db, {
          dedupeKey: row.dedupe_key,
          job: row.payload,
          reference: row.reference,
        });

        logger.warn(
          { outboxId: id, template: row.payload.template, recipient: row.payload.to },
          "Operator retried a failed transactional email",
        );

        reply.status(200).send({ id, status: "pending" });
      } catch (err) {
        reply.status(500).send({
          error: {
            code: "EMAIL_OUTBOX_RETRY_FAILED",
            message:
              err instanceof Error ? err.message : "Failed to retry the outbox email",
          },
        });
      }
    },
  );
}

/**
 * The claim matched nothing, so tell the operator which of the several possible
 * reasons it was — a retry button that says "done" without sending anything is
 * worse than no button, because the operator stops looking.
 */
async function refuseRetry(
  db: ReturnType<typeof getDb>,
  id: string,
  reply: FastifyReply,
): Promise<void> {
  const existing = await db.execute<{ status: string; has_payload: boolean }>(sql`
    SELECT status, payload IS NOT NULL AS has_payload
    FROM email_outbox WHERE id = ${id}
  `);

  const row = existing.rows[0];
  if (!row) {
    reply.status(404).send({
      error: { code: "EMAIL_OUTBOX_ROW_NOT_FOUND", message: "No such outbox email." },
    });
    return;
  }

  const refusal =
    row.status === "sent"
      ? REFUSALS.sent
      : row.has_payload
        ? REFUSALS.in_flight
        : REFUSALS.no_payload;

  reply.status(refusal.status).send({
    error: { code: refusal.code, message: refusal.message },
  });
}
