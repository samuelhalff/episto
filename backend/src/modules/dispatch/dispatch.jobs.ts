import { getQueue, QUEUE_NAMES, type SubmitDispatchJob } from "../../queue/index.js";

export function buildDispatchJobId(paymentId: string): string {
  return `dispatch:${paymentId}`;
}

export async function enqueueDispatchSubmission(job: SubmitDispatchJob): Promise<void> {
  await getQueue(QUEUE_NAMES.SUBMIT_DISPATCH).add("submit-dispatch", job, {
    jobId: buildDispatchJobId(job.paymentId),
  });
}
