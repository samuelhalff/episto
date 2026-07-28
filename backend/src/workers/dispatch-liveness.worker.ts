import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type DispatchLivenessJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb, type Db } from "../db/index.js";
import {
  findStuckDispatchAttempts,
  findUnwatchedUnknownDispatches,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import {
  enqueueDispatchReconciliation,
  requeueDispatchSubmission,
} from "../modules/dispatch/dispatch.jobs.js";
import { updateDraftStatusForDispatchSubmission } from "./dispatch-settlement.js";

const logger = createLogger("dispatch-liveness-worker");

/** How many stuck attempts one pass will touch. */
const LIVENESS_BATCH_SIZE = 50;

export interface LivenessSweepResult {
  requeued: number;
  flaggedUnknown: number;
  reconciliationRedriven: number;
}

/**
 * The user story:
 *
 *   A user paid for a registered letter. The worker that was submitting it died
 *   — the container was replaced, or BullMQ ran out of retries. Nothing is
 *   watching that letter any more. It must not sit `queued` and paid for
 *   forever, and it must not be posted twice on the way out of that state.
 *
 * Two outcomes, decided by whether the dead worker reached the provider:
 *
 *   - It never did (`submission_started_at IS NULL`): nothing was sent, so the
 *     submission is simply put back on the queue.
 *   - It did: we cannot tell a letter Swiss Post never received from one it
 *     already has. Resubmitting would risk posting twice, so the attempt goes
 *     to `unknown` — reconciliation looks at it, and failing that a human does
 *     (docs/07-operations/payment-dispatch-recovery.md §3).
 */
export async function sweepStuckDispatches(db: Db): Promise<LivenessSweepResult> {
  const stuck = await findStuckDispatchAttempts(db, LIVENESS_BATCH_SIZE);
  let requeued = 0;
  let reconciliationRedriven = 0;
  let flaggedUnknown = 0;

  for (const attempt of stuck) {
    try {
      if (attempt.submissionStarted) {
        await transitionDispatchState(db, attempt.id, "unknown", {
          failureReason:
            "Submission outcome unknown: the worker did not return after calling the provider",
        });
        // The draft has to follow the attempt. The worker that died was going
        // to do this; without it the user sees a paid letter still sitting in
        // `ready`, as though they had never checked out.
        try {
          await updateDraftStatusForDispatchSubmission(db, attempt.draftId, "submitted");
        } catch (statusErr) {
          logger.error(
            {
              dispatchId: attempt.id,
              draftId: attempt.draftId,
              err: statusErr instanceof Error ? statusErr.message : "Unknown error",
            },
            "Failed to move the draft to submitted while flagging an abandoned dispatch",
          );
        }
        await enqueueDispatchReconciliation({ dispatchAttemptId: attempt.id });
        flaggedUnknown++;
        logger.warn(
          { dispatchId: attempt.id, draftId: attempt.draftId },
          "Dispatch abandoned after the provider call; flagged unknown for reconciliation",
        );
        continue;
      }

      if (!attempt.paymentAttemptId) {
        // Nothing to re-drive: the submit job is keyed by payment.
        logger.error(
          { dispatchId: attempt.id, draftId: attempt.draftId },
          "Stuck dispatch has no payment attempt; leaving it for manual review",
        );
        continue;
      }

      await requeueDispatchSubmission({
        draftId: attempt.draftId,
        snapshotId: attempt.snapshotId,
        paymentId: attempt.paymentAttemptId,
      });
      requeued++;
      logger.warn(
        { dispatchId: attempt.id, draftId: attempt.draftId },
        "Stuck dispatch re-queued for submission",
      );
    } catch (err) {
      // One bad row must not stop the sweep: every other letter in the batch is
      // someone else's paid order.
      logger.error(
        {
          dispatchId: attempt.id,
          draftId: attempt.draftId,
          err: err instanceof Error ? err.message : "Unknown error",
        },
        "Failed to recover stuck dispatch",
      );
    }
  }

  // An `unknown` attempt whose hand-off to reconciliation was lost — often to
  // the same outage that made the outcome unknown — has nothing watching it.
  // Re-driving is safe: reconciliation only reads the provider, never resends.
  for (const attempt of await findUnwatchedUnknownDispatches(db, LIVENESS_BATCH_SIZE)) {
    try {
      await enqueueDispatchReconciliation({ dispatchAttemptId: attempt.id });
      reconciliationRedriven++;
      logger.warn(
        { dispatchId: attempt.id, draftId: attempt.draftId },
        "Unknown dispatch had no reconciliation in flight; re-driven",
      );
    } catch (err) {
      logger.error(
        {
          dispatchId: attempt.id,
          draftId: attempt.draftId,
          err: err instanceof Error ? err.message : "Unknown error",
        },
        "Failed to re-drive reconciliation for an unknown dispatch",
      );
    }
  }

  return { requeued, flaggedUnknown, reconciliationRedriven };
}

export async function processDispatchLivenessJob(
  job: Job<DispatchLivenessJob>,
): Promise<void> {
  const db = getDb();
  const result = await sweepStuckDispatches(db);

  if (
    result.requeued > 0 ||
    result.flaggedUnknown > 0 ||
    result.reconciliationRedriven > 0
  ) {
    logger.warn(result, "Dispatch liveness sweep recovered stuck attempts");
    job.log(
      `Liveness sweep: requeued=${result.requeued} unknown=${result.flaggedUnknown} redriven=${result.reconciliationRedriven}`,
    );
  }
}

export function startDispatchLivenessWorker(): Worker<DispatchLivenessJob> {
  return createWorker<DispatchLivenessJob>(
    QUEUE_NAMES.DISPATCH_LIVENESS,
    processDispatchLivenessJob,
    { concurrency: 1 },
  );
}
