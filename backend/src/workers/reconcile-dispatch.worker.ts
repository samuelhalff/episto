import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type ReconcileDispatchJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { reconcileDispatch } from "../modules/dispatch/dispatch-reconciliation.service.js";

const logger = createLogger("reconcile-dispatch-worker");

export async function processReconcileDispatchJob(
  job: Job<ReconcileDispatchJob>,
): Promise<void> {
  const { dispatchAttemptId } = job.data;
  try {
    const result = await reconcileDispatch(getDb(), dispatchAttemptId);
    job.log(`Reconciled: ${result.previousState} → ${result.state}`);
  } catch (err) {
    logger.error(
      {
        dispatchAttemptId,
        err: err instanceof Error ? err.message : "Unknown error",
      },
      "Reconciliation check failed",
    );
    throw err;
  }
}

export function startReconcileDispatchWorker(): Worker<ReconcileDispatchJob> {
  return createWorker<ReconcileDispatchJob>(
    QUEUE_NAMES.RECONCILE_DISPATCH,
    processReconcileDispatchJob,
    { concurrency: 5 },
  );
}
