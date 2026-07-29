import { UnrecoverableError, type Job, type Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SendEmailJob } from "../queue/index.js";
import { getDb } from "../db/index.js";
import { isPermanentEmailError, sendEmail } from "../modules/email/index.js";
import {
  claimEmailForSending,
  markEmailSent,
  recordEmailAttemptFailure,
} from "../modules/email/email-outbox.js";
import { createLogger } from "../shared/logging/index.js";
import { renderTemplate } from "./email-templates.js";

// Re-export for consumers (tests, scripts)
export { renderTemplate } from "./email-templates.js";

const logger = createLogger("email-worker");

/**
 * BullMQ increments `attemptsMade` only once an attempt has finished, so inside
 * a failing processor it still counts the *previous* ones. This is the same
 * comparison BullMQ itself uses to decide whether to schedule another retry —
 * getting it wrong either closes the outbox row while retries are still coming
 * or never closes it at all.
 */
function isFinalAttempt(job: Job<SendEmailJob>): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

/**
 * Email worker — processes transactional email jobs from the BullMQ queue.
 *
 * Each job is an attempt at an `email_outbox` row. The row is the durable half:
 * this worker is the only thing that can close it out, so it marks `sent` on
 * success and `failed` on the last attempt, and shouts when it does — a failed
 * email is a customer who never got the link to the letter they paid for, and
 * only a log line at that moment tells anyone.
 *
 * Payment receipts are owned by Stripe — this worker only handles
 * service/dispatch and operational email templates.
 */
export async function processSendEmailJob(job: Job<SendEmailJob>): Promise<void> {
  const { outboxId, to, template, locale, data, attachments } = job.data;

  // Claim before sending, never after. BullMQ redelivers: a lost lock, or a
  // crash between the provider accepting the mail and the job being marked
  // complete, runs this processor again on an email the customer already has.
  // Only a row that is still `pending` may be sent, and claiming it takes it
  // out of that state, so the second run finds nothing to do.
  const claim = outboxId ? await claimEmailForSending(getDb(), outboxId) : null;

  if (outboxId && !claim) {
    logger.info(
      { outboxId, template },
      "Skipping transactional email job: the outbox row is not pending (already sent, in flight, or failed)",
    );
    return;
  }

  try {
    const rendered = renderTemplate(template, locale, data);

    const messageId = await sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      // Resend remembers this for 24h and replays the original result instead
      // of sending again — the last line of defence for the window between the
      // provider accepting the mail and us recording that it did.
      ...(claim ? { idempotencyKey: claim.dedupeKey } : {}),
      ...(attachments && attachments.length > 0
        ? {
            attachments: attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.contentBase64,
            })),
          }
        : {}),
    });

    if (outboxId) await markEmailSent(getDb(), outboxId, messageId);

    job.log(`Email sent: ${messageId} (template=${template}, locale=${locale})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // A payload the provider will never accept — a malformed recipient, a bad
    // attachment, a from-address we are not allowed to use — does not get the
    // retry budget. Retries are for outages. Close the row now so the loud log
    // below fires while someone can still act on it, instead of 4h15m later.
    const permanent = isPermanentEmailError(err);
    const final = permanent || isFinalAttempt(job);

    if (outboxId) {
      // Bookkeeping must never replace the real error: whatever happens here,
      // the original failure is what BullMQ needs to see to schedule a retry.
      const failed = await recordEmailAttemptFailure(getDb(), outboxId, {
        error: message,
        final,
      }).catch((bookkeepingErr: unknown) => {
        logger.error(
          {
            outboxId,
            template,
            err:
              bookkeepingErr instanceof Error ? bookkeepingErr.message : "Unknown error",
          },
          "Failed to record transactional email attempt in the outbox",
        );
        return null;
      });

      if (failed) {
        logger.error(
          {
            outboxId,
            recipient: failed.recipient,
            template: failed.template,
            reference: failed.reference,
            attempts: failed.attempts,
            err: message,
            permanent,
          },
          permanent
            ? "Transactional email was rejected permanently by the provider; the customer did not receive it"
            : "Transactional email permanently failed after exhausting retries; the customer did not receive it",
        );
      }
    } else if (final) {
      logger.error(
        { recipient: to, template, permanent, err: message },
        "Transactional email permanently failed and has no outbox row",
      );
    }

    // Tell BullMQ not to bother: the row is already `failed`, so every further
    // attempt would claim nothing and send nothing. Throwing plainly would
    // still work, it would just be nine pointless wake-ups.
    if (permanent) throw new UnrecoverableError(message);

    throw err;
  }
}

export function startEmailWorker(): Worker<SendEmailJob> {
  return createWorker<SendEmailJob>(QUEUE_NAMES.SEND_EMAIL, processSendEmailJob, {
    concurrency: 5,
  });
}
