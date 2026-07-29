/**
 * The one door every transactional email goes through.
 *
 * Before this existed, an email was only ever a BullMQ job: eight call sites
 * each did their own `getQueue(SEND_EMAIL).add(...)`, and when Redis dropped
 * the job or the retries ran out the email simply stopped existing. Nobody was
 * told. `dispatch-accepted` carries the customer's only link to the letter they
 * paid for, so that failure mode was the worst one in the product.
 *
 * The rule now: the row is the record of intent, the job is the attempt. The
 * row is written first and committed before the job is enqueued, so a crash in
 * between leaves an email that is owed and findable rather than one that never
 * happened. The reverse order — enqueue then insert — would let a job run
 * against a row that does not exist yet.
 *
 * Deduplication moved with it. `dedupeKey` (`dispatch-accepted-<attemptId>`)
 * is UNIQUE on the table *and* the BullMQ job id, so the "send this once"
 * promise now outlives Redis: completed jobs age out within a day, the row
 * does not.
 */
import { sql } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("email-outbox");

/**
 * How long a row may sit `pending` before the sweep assumes its job is gone.
 *
 * Must stay comfortably above the email queue's own retry budget (~4h15m), or
 * the sweep would re-enqueue jobs that are merely mid-backoff and turn a
 * provider outage into duplicate mail.
 */
export const OUTBOX_STALL_HOURS = 6;

/** How many stalled rows one sweep will re-drive. */
export const OUTBOX_SWEEP_BATCH_SIZE = 50;

/**
 * The durable ceiling on attempts, across every job a row has ever had.
 *
 * BullMQ's own `attempts: 10` is per-job, and a swept re-enqueue is a *new*
 * job — so without a cumulative cap a row that fails for a reason no retry can
 * fix (a mailbox that no longer exists, a payload the provider will always
 * reject) is re-driven every stall window, forever, and nobody ever gets the
 * `failed` row that would tell them to look.
 *
 * 30 is three full BullMQ budgets: the first enqueue plus two sweeps, spanning
 * at least 2 × OUTBOX_STALL_HOURS (12h) of wall clock. A provider outage that
 * has not cleared in half a day is not something more retries will solve; it
 * needs a person.
 */
export const OUTBOX_MAX_ATTEMPTS = 30;

export interface EnqueueTransactionalEmailArgs {
  /** Logical identity of this email — stable across retries and redeliveries. */
  dedupeKey: string;
  job: SendEmailJob;
  /** Order reference or draft id, so a failed row can be traced to an order. */
  reference?: string | null;
}

/**
 * An operator reading a failed row needs to find the order behind it. Callers
 * that know the reference pass it; for the rest the payload already carries one
 * under a predictable name, and guessing right most of the time beats a column
 * that is always null.
 */
function deriveReference(args: EnqueueTransactionalEmailArgs): string | null {
  if (args.reference) return args.reference;
  const data = args.job.data as Record<string, unknown>;
  for (const key of ["orderRef", "draftId", "dispatchAttemptId"]) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** A promise recorded in the outbox and not yet handed to the queue. */
export interface RecordedTransactionalEmail {
  outboxId: string;
  dedupeKey: string;
  job: SendEmailJob;
}

/**
 * Write the promise, without dispatching it.
 *
 * This is the half that is safe to run inside a caller's transaction, and it
 * exists so a caller can make "the business fact happened" and "an email is
 * owed for it" the same commit. Take that pairing seriously wherever the
 * business fact is *also* the thing that makes the email un-repeatable: a
 * receipt row is inserted once and every later attempt short-circuits on it, so
 * a crash between two separate commits leaves a customer permanently owed a
 * receipt with nothing in the system that knows it.
 *
 * Returns null when the outbox already holds this `dedupeKey`. Deliberately
 * does NOT run the conflict recovery below — that ends in a `queue.add`, which
 * must never happen inside a transaction that may still roll back.
 */
export async function recordTransactionalEmail(
  db: Db,
  args: EnqueueTransactionalEmailArgs,
): Promise<RecordedTransactionalEmail | null> {
  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO email_outbox (dedupe_key, recipient, template, locale, reference, payload)
    VALUES (
      ${args.dedupeKey},
      ${args.job.to},
      ${args.job.template},
      ${args.job.locale},
      ${deriveReference(args)},
      ${JSON.stringify(args.job)}::jsonb
    )
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id
  `);

  const outboxId = inserted.rows[0]?.id;
  if (!outboxId) return null;
  return { outboxId, dedupeKey: args.dedupeKey, job: args.job };
}

/**
 * Hand a recorded promise to the queue. Call this only after the transaction
 * that recorded it has committed — a job dispatched for a row that then rolls
 * away is a worker looking up an outbox id that does not exist.
 *
 * A throw is the caller's to handle, and leaves the row `pending` for the stall
 * sweep, which is the same recovery the row has always relied on.
 */
export async function dispatchRecordedEmail(
  recorded: RecordedTransactionalEmail,
): Promise<void> {
  await getQueue(QUEUE_NAMES.SEND_EMAIL).add(
    recorded.job.template,
    { ...recorded.job, outboxId: recorded.outboxId } satisfies SendEmailJob,
    { jobId: recorded.dedupeKey },
  );
}

/**
 * Record the email, then enqueue it.
 *
 * Returns false when the outbox already holds this `dedupeKey` — the email was
 * promised earlier and is either in flight, sent, or failed and awaiting a
 * human. Re-promising it would be a second send.
 *
 * A throw from the enqueue is propagated (callers such as the under-review
 * sweep release their claim on it) and deliberately leaves the row `pending`:
 * the stall sweep is what recovers it, and the caller's retry is refused by the
 * unique key rather than producing a duplicate.
 *
 * The INSERT here commits on its own connection, so for callers that pass the
 * top-level `db` the window between the business fact and the promise is still
 * open. That is acceptable wherever a retry of the business operation would
 * re-attempt the email too. Where it would not — see recordTransactionalEmail —
 * use the two halves instead.
 */
export async function enqueueTransactionalEmail(
  db: Db,
  args: EnqueueTransactionalEmailArgs,
): Promise<boolean> {
  const recorded = await recordTransactionalEmail(db, args);
  if (!recorded) return await recoverConflictingRow(db, args);

  await dispatchRecordedEmail(recorded);
  return true;
}

/**
 * The conflict case that is not actually a duplicate.
 *
 * `DO NOTHING` cannot tell "already sent" from "row written, then the process
 * died before the job was enqueued". The second one is a promise nobody is
 * working on: the row sits `pending` and the caller, told `false`, walks away.
 * Until the stall sweep runs hours later, that email exists only as a row.
 *
 * So on conflict we look. A still-`pending` row gets its job put back under the
 * same `dedupeKey` job id, which makes this harmless if the job does exist —
 * BullMQ ignores an add with a job id it already has. `sent` and `failed` rows
 * are left exactly alone: re-adding those is the double send this table exists
 * to prevent. `sending` is left alone too — a worker is holding it right now.
 *
 * Still returns false: the email was promised by an earlier call, not this one.
 */
async function recoverConflictingRow(
  db: Db,
  args: EnqueueTransactionalEmailArgs,
): Promise<false> {
  const existing = await db.execute<{
    id: string;
    status: string;
    payload: SendEmailJob | null;
  }>(sql`
    SELECT id, status, payload FROM email_outbox WHERE dedupe_key = ${args.dedupeKey}
  `);

  const row = existing.rows[0];
  if (!row || row.status !== "pending" || !row.payload) return false;

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add(
    row.payload.template,
    { ...row.payload, outboxId: row.id } satisfies SendEmailJob,
    { jobId: args.dedupeKey },
  );

  logger.info(
    { outboxId: row.id, template: row.payload.template },
    "Re-promised transactional email already had a pending outbox row; re-enqueued its job",
  );

  return false;
}

/**
 * Take exclusive ownership of a row before spending a provider call on it.
 *
 * BullMQ is at-least-once. A lost worker lock, or a crash after the send but
 * before the job is marked complete, redelivers the job — and the old worker
 * called Resend first and only then looked at the outbox, so the customer got
 * the email twice. This UPDATE is the gate: only a `pending` row can be
 * claimed, and claiming it moves it to `sending`.
 *
 * Returns null when the row is already `sent` (this job is a redelivery of an
 * email that went out), already `sending` (another worker has it), `failed`
 * (it needs a human, not another attempt), or gone. In every one of those cases
 * the correct action is to send nothing.
 *
 * The attempt counter is incremented here rather than on the way out, so an
 * attempt that dies mid-flight — the case the whole gate exists for — is still
 * counted against `OUTBOX_MAX_ATTEMPTS`.
 */
export async function claimEmailForSending(
  db: Db,
  outboxId: string,
): Promise<{ dedupeKey: string; attempts: number } | null> {
  const claimed = await db.execute<{ dedupe_key: string; attempts: number }>(sql`
    UPDATE email_outbox
    SET status = 'sending',
        last_attempted_at = NOW(),
        attempts = attempts + 1
    WHERE id = ${outboxId}
      AND status = 'pending'
    RETURNING dedupe_key, attempts
  `);

  const row = claimed.rows[0];
  if (!row) return null;
  return { dedupeKey: row.dedupe_key, attempts: Number(row.attempts) };
}

/**
 * The provider took it. `provider_message_id` is what support quotes at Resend.
 *
 * The payload is dropped at the same moment. It has done its only job — there
 * is nothing left to re-drive — and it is the expensive, sensitive half of the
 * row: receipt payloads carry a base64 PDF of what the customer bought, and
 * every payload carries their address and the body of their mail. Keeping them
 * forever would make this table both the largest and the most regrettable one
 * in the database.
 *
 * What survives is the tombstone the dedupe promise actually needs:
 * `dedupe_key`, `status`, the timestamps, and `provider_message_id`. A second
 * promise of the same email is still refused; support can still answer "did it
 * go, and what is its Resend id?"
 *
 * `attempts` is not touched: the claim already counted this attempt.
 */
export async function markEmailSent(
  db: Db,
  outboxId: string,
  providerMessageId: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE email_outbox
    SET status = 'sent',
        sent_at = NOW(),
        last_attempted_at = NOW(),
        last_error = NULL,
        payload = NULL,
        provider_message_id = ${providerMessageId}
    WHERE id = ${outboxId}
  `);
}

export interface EmailFailureRecord {
  recipient: string;
  template: string;
  reference: string | null;
  attempts: number;
}

/**
 * Record one failed attempt, and close the row out if it was the last one.
 *
 * Returns the row when this was the final attempt, so the caller can raise the
 * alarm with the recipient and order reference in hand — a `failed` row nobody
 * reads is the same silence this whole table exists to end.
 *
 * A non-final attempt releases the claim back to `pending`, which is what makes
 * the row visible to both the next BullMQ retry and the stall sweep.
 * `attempts` is not incremented here — `claimEmailForSending` already did.
 */
export async function recordEmailAttemptFailure(
  db: Db,
  outboxId: string,
  args: { error: string; final: boolean },
): Promise<EmailFailureRecord | null> {
  const updated = await db.execute<{
    recipient: string;
    template: string;
    reference: string | null;
    attempts: number;
  }>(sql`
    UPDATE email_outbox
    SET status = ${args.final ? "failed" : "pending"},
        last_attempted_at = NOW(),
        last_error = ${args.error}
    WHERE id = ${outboxId}
      AND status <> 'sent'
    RETURNING recipient, template, reference, attempts
  `);

  const row = updated.rows[0];
  if (!row || !args.final) return null;
  return {
    recipient: row.recipient,
    template: row.template,
    reference: row.reference,
    attempts: Number(row.attempts),
  };
}

interface StalledOutboxRow extends Record<string, unknown> {
  id: string;
  dedupe_key: string;
  payload: SendEmailJob;
}

/**
 * A row is stalled when it is still owed and nothing has touched it for a full
 * stall window.
 *
 * `sending` is included deliberately. A worker that claimed a row and then died
 * — OOM, deploy, lost lock — leaves it there, and if the sweep only looked at
 * `pending` that email would be stranded in a status no retry ever revisits.
 * The stall window is long enough that a live send is never mistaken for a dead
 * one.
 *
 * `payload IS NOT NULL` is belt-and-braces against the pruning in
 * `markEmailSent`: a sent row is excluded by status already, but re-enqueueing
 * a job from a null payload would produce an unsendable job rather than an
 * obvious error, so the predicate says so out loud.
 */
const stalledPredicate = sql`
  status IN ('pending', 'sending')
  AND payload IS NOT NULL
  AND COALESCE(last_attempted_at, created_at)
      <= NOW() - make_interval(hours => ${OUTBOX_STALL_HOURS})
`;

/**
 * Close out rows that have exhausted the durable attempt budget.
 *
 * Without this the sweep is an infinite retry machine: each re-enqueue is a new
 * BullMQ job with `attemptsMade` back at zero, so a permanently undeliverable
 * email is retried every stall window until the heat death of the mail server.
 * Past `OUTBOX_MAX_ATTEMPTS` the answer stops being "try again" and becomes
 * "tell someone", which is what a `failed` row and this log line are for.
 */
async function failExhaustedOutboxRows(db: Db): Promise<void> {
  const exhausted = await db.execute<{
    id: string;
    recipient: string;
    template: string;
    reference: string | null;
    attempts: number;
    last_error: string | null;
  }>(sql`
    UPDATE email_outbox
    SET status = 'failed',
        last_error = COALESCE(last_error, 'Exceeded the durable attempt budget')
    WHERE ${stalledPredicate}
      AND attempts >= ${OUTBOX_MAX_ATTEMPTS}
    RETURNING id, recipient, template, reference, attempts, last_error
  `);

  for (const row of exhausted.rows) {
    logger.error(
      {
        outboxId: row.id,
        recipient: row.recipient,
        template: row.template,
        reference: row.reference,
        attempts: Number(row.attempts),
        err: row.last_error,
      },
      "Transactional email exhausted its durable attempt budget; the customer did not receive it",
    );
  }
}

/**
 * Re-drive rows whose job Redis no longer has.
 *
 * Claim-with-conditional-UPDATE, the same shape the under-review sweep uses:
 * the `last_attempted_at` bump is the claim, so two sweeps running at once
 * cannot both re-enqueue the same row, and a row that has since been sent
 * fails the status predicate and is left alone. The claim also resets a stuck
 * `sending` row to `pending`, which is what the worker's own claim requires.
 *
 * Re-enqueueing under the original `dedupeKey` as job id makes the redelivery
 * a no-op whenever the job does still exist in Redis.
 */
export async function sweepStalledEmailOutbox(
  db: Db,
  limit: number = OUTBOX_SWEEP_BATCH_SIZE,
): Promise<number> {
  await failExhaustedOutboxRows(db);

  const candidates = await db.execute<StalledOutboxRow>(sql`
    SELECT id, dedupe_key, payload
    FROM email_outbox
    WHERE ${stalledPredicate}
      AND attempts < ${OUTBOX_MAX_ATTEMPTS}
    ORDER BY created_at
    LIMIT ${limit}
  `);

  let requeued = 0;

  for (const row of candidates.rows) {
    const claimed = await db.execute<{ id: string }>(sql`
      UPDATE email_outbox
      SET last_attempted_at = NOW(),
          status = 'pending'
      WHERE id = ${row.id}
        AND ${stalledPredicate}
        AND attempts < ${OUTBOX_MAX_ATTEMPTS}
      RETURNING id
    `);
    if (claimed.rows.length === 0) continue;

    try {
      await getQueue(QUEUE_NAMES.SEND_EMAIL).add(
        row.payload.template,
        { ...row.payload, outboxId: row.id } satisfies SendEmailJob,
        { jobId: row.dedupe_key },
      );
      requeued++;
      logger.warn(
        { outboxId: row.id, template: row.payload.template },
        "Stalled transactional email had no job in Redis; re-enqueued",
      );
    } catch (err) {
      // One bad row must not stop the sweep: every other row is someone else's
      // unsent email. The claim is left in place — the next pass picks it up
      // once the stall window has elapsed again.
      logger.error(
        {
          outboxId: row.id,
          template: row.payload.template,
          err: err instanceof Error ? err.message : "Unknown error",
        },
        "Failed to re-enqueue stalled transactional email",
      );
    }
  }

  return requeued;
}
