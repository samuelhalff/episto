import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type EmailOutboxSweepJob } from "../queue/index.js";
import { getDb } from "../db/index.js";
import { createLogger } from "../shared/logging/index.js";
import { sweepStalledEmailOutbox } from "../modules/email/email-outbox.js";

const logger = createLogger("email-outbox-worker");

/**
 * The case the queue cannot recover from itself.
 *
 * BullMQ retries a job it still has. It has no answer for a job it lost — a
 * Redis eviction, a flush, a restart of a Redis without persistence — and the
 * customer is still owed that email. The outbox row survives all three, so this
 * sweep walks the rows that are still `pending` long past their retry budget
 * and puts them back on the queue under their original job id.
 *
 * It runs on its own repeatable job rather than inside the dispatch liveness
 * sweep: emails are owed by refunds and receipts too, not only by dispatches.
 */
export async function processEmailOutboxSweepJob(
  job: Job<EmailOutboxSweepJob>,
): Promise<void> {
  const requeued = await sweepStalledEmailOutbox(getDb());

  if (requeued > 0) {
    logger.warn({ requeued }, "Email outbox sweep re-enqueued stalled emails");
    job.log(`Email outbox sweep: requeued=${requeued}`);
  }
}

export function startEmailOutboxWorker(): Worker<EmailOutboxSweepJob> {
  return createWorker<EmailOutboxSweepJob>(
    QUEUE_NAMES.EMAIL_OUTBOX_SWEEP,
    processEmailOutboxSweepJob,
    { concurrency: 1 },
  );
}
