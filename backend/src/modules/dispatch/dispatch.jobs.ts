import {
  getQueue,
  QUEUE_NAMES,
  type SubmitDispatchJob,
  type ReconcileDispatchJob,
} from "../../queue/index.js";

export function buildDispatchJobId(paymentId: string): string {
  return `dispatch-${paymentId}`;
}

export async function enqueueDispatchSubmission(job: SubmitDispatchJob): Promise<void> {
  await getQueue(QUEUE_NAMES.SUBMIT_DISPATCH).add("submit-dispatch", job, {
    jobId: buildDispatchJobId(job.paymentId),
  });
}

/**
 * Put a stuck submission back on the queue.
 *
 * The job id is deterministic, and BullMQ treats an add with an id it still
 * holds — including one sitting in the completed set — as a no-op. A letter the
 * liveness sweep found abandoned would then silently stay abandoned, so the old
 * job record is dropped first.
 */
export async function requeueDispatchSubmission(job: SubmitDispatchJob): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.SUBMIT_DISPATCH);
  await queue.remove(buildDispatchJobId(job.paymentId)).catch(() => undefined);
  await enqueueDispatchSubmission(job);
}

export function buildDispatchReconcileJobId(dispatchAttemptId: string): string {
  return `dispatch-reconcile-${dispatchAttemptId}`;
}

export async function enqueueDispatchReconciliation(
  job: ReconcileDispatchJob,
): Promise<void> {
  await getQueue(QUEUE_NAMES.RECONCILE_DISPATCH).add("reconcile-dispatch", job, {
    jobId: buildDispatchReconcileJobId(job.dispatchAttemptId),
  });
}

export async function requeueDispatchReconciliation(
  job: ReconcileDispatchJob,
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.RECONCILE_DISPATCH);
  await queue
    .remove(buildDispatchReconcileJobId(job.dispatchAttemptId))
    .catch(() => undefined);
  await enqueueDispatchReconciliation(job);
}
