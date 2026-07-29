/**
 * The email that admits we do not know yet.
 *
 * A dispatch attempt in `unknown` is one where the provider call happened but
 * the outcome did not come back. Most of them are not really in doubt: the next
 * reconcile poll answers them, usually within minutes. Mailing the customer the
 * moment the state turns `unknown` would therefore tell people their letter is
 * at risk far more often than it actually is — a false alarm on every transient
 * provider timeout, followed by nothing, which is worse for trust than the
 * silence it replaced.
 *
 * DWELL POLICY (product decision): the email is sent once, when an attempt has
 * been in `unknown` for at least UNDER_REVIEW_DWELL_HOURS and still has no
 * definitive outcome. A full day is the point where the balance flips — by then
 * reconciliation has had many passes at it, so the ambiguity is real, and our
 * silence has become worse than an honest "we don't know yet".
 *
 * Sent at most once per dispatch attempt. Two belts, because the sweep runs on
 * a schedule and BullMQ jobs can be redelivered:
 *   1. `under_review_notified_at`, claimed with a conditional UPDATE, so two
 *      concurrent sweeps cannot both win and a completed job aging out of Redis
 *      cannot un-remember the send.
 *   2. The email outbox's unique `dedupe_key`, keyed on the dispatch attempt,
 *      which also serves as the BullMQ job id.
 */
import { sql } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { type SendEmailJob } from "../../queue/index.js";
import { enqueueTransactionalEmail } from "../email/email-outbox.js";
import { buildDispatchEmailContext } from "./dispatch-email-context.js";

const logger = createLogger("dispatch-review-notifications");

/** How long an attempt must sit in `unknown` before we say so. See above. */
export const UNDER_REVIEW_DWELL_HOURS = 24;

/** How many attempts one sweep will notify. */
export const UNDER_REVIEW_BATCH_SIZE = 50;

export interface UnderReviewCandidate {
  id: string;
  draftId: string;
  paymentAttemptId: string | null;
}

/**
 * Attempts that have dwelled in `unknown` past the window and have not been
 * told.
 *
 * The dwell is measured from the status event that put the attempt into
 * `unknown`, not from `updated_at`: reconciliation writes `last_checked_at` on
 * every poll, so `updated_at` restarts the clock every few minutes and an
 * attempt stuck for a week would never look old enough.
 */
export async function findDispatchAttemptsUnderReview(
  db: Db,
  limit: number,
): Promise<UnderReviewCandidate[]> {
  const rows = await db.execute<{
    id: string;
    draft_id: string;
    payment_attempt_id: string | null;
    unknown_since: Date;
  }>(sql`
    SELECT da.id, da.draft_id, da.payment_attempt_id, e.unknown_since
    FROM dispatch_attempts da
    JOIN (
      SELECT dispatch_attempt_id, MAX(created_at) AS unknown_since
      FROM dispatch_status_events
      WHERE new_state = 'unknown'
      GROUP BY dispatch_attempt_id
    ) e ON e.dispatch_attempt_id = da.id
    WHERE da.state = 'unknown'
      AND da.under_review_notified_at IS NULL
      AND e.unknown_since <= NOW() - make_interval(hours => ${UNDER_REVIEW_DWELL_HOURS})
    ORDER BY e.unknown_since
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    draftId: row.draft_id,
    paymentAttemptId: row.payment_attempt_id,
  }));
}

/**
 * Take the right to send, atomically.
 *
 * The state re-check inside the UPDATE is what stops an attempt that resolved
 * between the scan and the send — a reconcile poll landing in that gap is
 * common, and "your letter is in doubt" is the wrong thing to say about a
 * letter Swiss Post has just accepted.
 *
 * `updated_at` is deliberately left alone: the liveness sweep uses it to find
 * `unknown` attempts nothing is watching, and touching it here would hide them.
 */
async function claimUnderReviewNotification(db: Db, attemptId: string): Promise<boolean> {
  const claimed = await db.execute<{ id: string }>(sql`
    UPDATE dispatch_attempts
    SET under_review_notified_at = NOW()
    WHERE id = ${attemptId}
      AND state = 'unknown'
      AND under_review_notified_at IS NULL
    RETURNING id
  `);

  return claimed.rows.length > 0;
}

/** Give the claim back so a later sweep retries — only for infrastructure failures. */
async function releaseUnderReviewNotification(db: Db, attemptId: string): Promise<void> {
  await db.execute(sql`
    UPDATE dispatch_attempts
    SET under_review_notified_at = NULL
    WHERE id = ${attemptId}
  `);
}

/**
 * Enqueue the under-review email for one attempt.
 *
 * Returns false when there is nobody to write to: a session erased under a
 * data-deletion request has no email left, and a draft or payment that no
 * longer resolves cannot produce an order reference. Both are quiet skips.
 */
export async function enqueueDispatchUnderReviewEmail(
  db: Db,
  args: { dispatchAttemptId: string; draftId: string; paymentId: string },
): Promise<boolean> {
  const context = await buildDispatchEmailContext(db, {
    draftId: args.draftId,
    paymentId: args.paymentId,
  });
  if (!context) return false;

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-under-review",
    locale: context.locale,
    data: context,
  };

  await enqueueTransactionalEmail(db, {
    dedupeKey: `dispatch-under-review-${args.dispatchAttemptId}`,
    job,
  });

  return true;
}

/** One pass: notify every attempt that has dwelled in `unknown` long enough. */
export async function sweepDispatchAttemptsUnderReview(
  db: Db,
  limit: number = UNDER_REVIEW_BATCH_SIZE,
): Promise<number> {
  let notified = 0;

  for (const attempt of await findDispatchAttemptsUnderReview(db, limit)) {
    if (!(await claimUnderReviewNotification(db, attempt.id))) continue;

    if (!attempt.paymentAttemptId) {
      // No payment means no order reference and no download link: there is
      // nothing honest to send. Manual review owns this row — and it keeps the
      // claim, so this is reported once rather than on every sweep for as long
      // as the row is stuck. An alert that repeats every few minutes forever is
      // an alert nobody reads.
      logger.error(
        { dispatchId: attempt.id, draftId: attempt.draftId },
        "Under-review dispatch has no payment attempt; leaving it for manual review",
      );
      continue;
    }

    try {
      const sent = await enqueueDispatchUnderReviewEmail(db, {
        dispatchAttemptId: attempt.id,
        draftId: attempt.draftId,
        paymentId: attempt.paymentAttemptId,
      });
      if (sent) notified++;
    } catch (err) {
      // The claim is only meaningful if the mail actually went on the queue.
      await releaseUnderReviewNotification(db, attempt.id).catch(() => {});
      // One bad row must not stop the sweep: every other attempt in the batch
      // is someone else's paid letter waiting on the same news.
      logger.error(
        {
          dispatchId: attempt.id,
          draftId: attempt.draftId,
          err: err instanceof Error ? err.message : "Unknown error",
        },
        "Failed to enqueue under-review email",
      );
    }
  }

  return notified;
}
