import type { Db } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { buildDispatchEmailContext } from "./dispatch-email-context.js";

export async function enqueueDispatchSubmittedEmail(
  db: Db,
  args: { dispatchAttemptId: string; draftId: string; paymentId: string },
): Promise<void> {
  const context = await buildDispatchEmailContext(db, {
    draftId: args.draftId,
    paymentId: args.paymentId,
  });
  if (!context) return;

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-submitted",
    locale: context.locale,
    data: context,
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-submitted", job, {
    jobId: `dispatch-submitted-${args.dispatchAttemptId}`,
  });
}

export async function enqueueDispatchAcceptedEmail(
  db: Db,
  args: {
    dispatchAttemptId: string;
    draftId: string;
    paymentId: string;
    providerReference: string | null;
    trackingNumber: string | null;
  },
): Promise<void> {
  const context = await buildDispatchEmailContext(db, {
    draftId: args.draftId,
    paymentId: args.paymentId,
  });
  if (!context) return;

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-accepted",
    locale: context.locale,
    data: {
      ...context,
      providerReference: args.providerReference,
      trackingNumber: args.trackingNumber,
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-accepted", job, {
    jobId: `dispatch-accepted-${args.dispatchAttemptId}`,
  });
}
