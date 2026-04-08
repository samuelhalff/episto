import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createWorker, QUEUE_NAMES, type ReconcileDispatchJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import {
  getDispatchAttempt,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import { getDispatchAdapter } from "../modules/dispatch/adapters/postal.adapter.js";
import { enqueueDispatchAcceptedEmail } from "../modules/dispatch/dispatch-notifications.js";
import { enqueuePaymentReceiptEmail } from "../modules/payments/payment-notifications.js";
import { acquireRedisLock } from "../shared/redis-lock.js";
import {
  canFinalizeDispatchResolution,
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
} from "./dispatch-settlement.js";

const logger = createLogger("reconcile-dispatch-worker");
const RECONCILE_LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Reconcile-ambiguous-dispatch worker — resolves dispatch attempts stuck in
 * "submitted" or "unknown" state by polling the provider for a definitive answer.
 *
 * Trigger: Scheduled or when a dispatch state is stuck.
 * Steps:
 *   1. Load dispatch attempt from DB
 *   2. Check provider for current status via adapter
 *   3. Transition dispatch state based on provider response
 *   4. Update last_checked_at timestamp
 */
export async function processReconcileDispatchJob(
  job: Job<ReconcileDispatchJob>,
): Promise<void> {
  const { dispatchAttemptId } = job.data;
  const lock = await acquireRedisLock(
    `dispatch-reconcile:${dispatchAttemptId}`,
    RECONCILE_LOCK_TTL_MS,
  );
  if (!lock) {
    logger.info({ dispatchAttemptId }, "Skipping duplicate dispatch reconciliation");
    return;
  }

  const db = getDb();
  const adapter = getDispatchAdapter();

  logger.info({ dispatchAttemptId }, "Reconciling dispatch attempt");

  try {
    const attempt = await getDispatchAttempt(db, dispatchAttemptId);
    if (!attempt) {
      logger.warn({ dispatchAttemptId }, "Dispatch attempt not found, skipping");
      return;
    }

    // Only reconcile if in a non-terminal state
    if (!["submitted", "unknown"].includes(attempt.state)) {
      logger.info(
        { dispatchAttemptId, state: attempt.state },
        "Dispatch already in terminal state, skipping reconciliation",
      );
      return;
    }

    if (!attempt.providerReference) {
      logger.warn(
        { dispatchAttemptId },
        "No provider reference available, cannot reconcile",
      );
      // Transition to unknown if still in submitted
      if (attempt.state === "submitted") {
        await transitionDispatchState(db, dispatchAttemptId, "unknown", {
          failureReason: "No provider reference available for reconciliation",
        });
      }
      return;
    }

    const status = await adapter.checkStatus(attempt.providerReference);

    if (status.state === "accepted" || status.state === "rejected") {
      const settlement = await settlePaymentForDispatchResolution(
        db,
        attempt.draftId,
        attempt.paymentAttemptId,
        status.state,
      );

      if (!canFinalizeDispatchResolution(status.state, settlement.payment)) {
        throw new Error(
          `Cannot finalize dispatch ${dispatchAttemptId} as ${status.state} while payment is ${settlement.payment?.state ?? "missing"}`,
        );
      }

      await updateDraftStatusForDispatchResolution(
        db,
        attempt.draftId,
        status.state,
        settlement.payment,
      );

      await transitionDispatchState(db, dispatchAttemptId, status.state, {
        providerReference: status.providerReference ?? undefined,
        trackingNumber: status.trackingNumber,
        failureReason: status.failureReason ?? undefined,
      });

      if (settlement.payment && settlement.rawOrderAccessToken) {
        try {
          await enqueuePaymentReceiptEmail(
            db,
            settlement.payment,
            settlement.rawOrderAccessToken,
          );
        } catch (receiptErr) {
          logger.error(
            {
              dispatchAttemptId,
              err: receiptErr instanceof Error ? receiptErr.message : "Unknown error",
            },
            "Failed to enqueue payment receipt email after reconciliation",
          );
        }
      }

      if (status.state === "accepted") {
        try {
          await enqueueDispatchAcceptedEmail(db, {
            dispatchAttemptId,
            draftId: attempt.draftId,
            providerReference: status.providerReference ?? null,
            trackingNumber: status.trackingNumber ?? null,
            rawOrderAccessToken: settlement.rawOrderAccessToken,
          });
        } catch (acceptedEmailErr) {
          logger.error(
            {
              dispatchAttemptId,
              err:
                acceptedEmailErr instanceof Error
                  ? acceptedEmailErr.message
                  : "Unknown error",
            },
            "Failed to enqueue accepted dispatch email after reconciliation",
          );
        }
      }

      logger.info(
        { dispatchAttemptId, from: attempt.state, to: status.state },
        "Dispatch state reconciled",
      );
    } else if (status.state !== attempt.state) {
      await transitionDispatchState(db, dispatchAttemptId, status.state, {
        providerReference: status.providerReference ?? undefined,
        trackingNumber: status.trackingNumber,
        failureReason: status.failureReason ?? undefined,
      });
    }

    await db
      .update(schema.dispatchAttempts)
      .set({
        lastCheckedAt: new Date(),
        trackingNumber: status.trackingNumber,
      })
      .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));

    job.log(`Reconciled: ${attempt.state} → ${status.state}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ dispatchAttemptId, err: message }, "Reconciliation check failed");

    // Update last_checked_at even on failure
    await db
      .update(schema.dispatchAttempts)
      .set({ lastCheckedAt: new Date() })
      .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));

    throw err; // Re-throw for BullMQ retry
  } finally {
    try {
      await lock.release();
    } catch (releaseErr) {
      logger.warn({ dispatchAttemptId, err: releaseErr }, "Failed to release reconcile lock");
    }
  }
}

export function startReconcileDispatchWorker(): Worker<ReconcileDispatchJob> {
  return createWorker<ReconcileDispatchJob>(
    QUEUE_NAMES.RECONCILE_DISPATCH,
    processReconcileDispatchJob,
    { concurrency: 5 },
  );
}
