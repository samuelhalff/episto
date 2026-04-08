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
