import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import {
  createWorker,
  QUEUE_NAMES,
  type ReconcileDispatchJob,
} from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import {
  getDispatchAttempt,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import { getDispatchAdapter } from "../modules/dispatch/adapters/postal.adapter.js";

const logger = createLogger("reconcile-dispatch-worker");

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
export function startReconcileDispatchWorker(): Worker<ReconcileDispatchJob> {
  return createWorker<ReconcileDispatchJob>(
    QUEUE_NAMES.RECONCILE_DISPATCH,
    async (job: Job<ReconcileDispatchJob>) => {
      const { dispatchAttemptId } = job.data;
      const db = getDb();
      const adapter = getDispatchAdapter();

      logger.info({ dispatchAttemptId }, "Reconciling dispatch attempt");

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

      try {
        const status = await adapter.checkStatus(attempt.providerReference);

        // Map provider state to our dispatch state
        const newState = mapProviderState(status.state);

        if (newState && newState !== attempt.state) {
          await transitionDispatchState(db, dispatchAttemptId, newState, {
            providerPayload: status.providerPayload,
          });

          logger.info(
            { dispatchAttemptId, from: attempt.state, to: newState },
            "Dispatch state reconciled",
          );
        }

        // Update last_checked_at
        await db
          .update(schema.dispatchAttempts)
          .set({ lastCheckedAt: new Date() })
          .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));

        job.log(`Reconciled: ${attempt.state} → ${newState ?? "(no change)"}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logger.error(
          { dispatchAttemptId, err: message },
          "Reconciliation check failed",
        );

        // Update last_checked_at even on failure
        await db
          .update(schema.dispatchAttempts)
          .set({ lastCheckedAt: new Date() })
          .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));

        throw err; // Re-throw for BullMQ retry
      }
    },
    { concurrency: 5 },
  );
}

/**
 * Map provider-reported state to our dispatch state enum.
 * Returns null if the state cannot be mapped (keep current state).
 */
function mapProviderState(providerState: string): string | null {
  switch (providerState) {
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "reconciled":
      return "reconciled";
    default:
      // Unknown provider state — log but don't transition
      return null;
  }
}
