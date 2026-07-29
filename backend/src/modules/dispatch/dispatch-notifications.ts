import type { Db } from "../../db/index.js";
import { type SendEmailJob } from "../../queue/index.js";
import { enqueueTransactionalEmail } from "../email/email-outbox.js";
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

  await enqueueTransactionalEmail(db, {
    dedupeKey: `dispatch-submitted-${args.dispatchAttemptId}`,
    job,
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

  await enqueueTransactionalEmail(db, {
    dedupeKey: `dispatch-accepted-${args.dispatchAttemptId}`,
    job,
  });
}

export async function enqueueDispatchFailedEmail(
  db: Db,
  args: {
    dispatchAttemptId: string;
    draftId: string;
    paymentId: string;
    failureReason: string;
  },
): Promise<void> {
  const context = await buildDispatchEmailContext(db, {
    draftId: args.draftId,
    paymentId: args.paymentId,
  });
  if (!context) return;

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-failed",
    locale: context.locale,
    data: {
      ...context,
      failureReason: args.failureReason,
    },
  };

  await enqueueTransactionalEmail(db, {
    dedupeKey: `dispatch-failed-${args.dispatchAttemptId}`,
    job,
  });
}
