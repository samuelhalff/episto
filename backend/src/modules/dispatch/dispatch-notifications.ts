import type { Db } from "../../db/index.js";
import { type SendEmailJob } from "../../queue/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { buildConfirmationBundlePdf } from "../rendering/pdf-access.js";
import { enqueueTransactionalEmail } from "../email/email-outbox.js";
import { buildDispatchEmailContext } from "./dispatch-email-context.js";

const logger = createLogger("dispatch-notifications");

// The justificatif bundle carries the customer's own letter + enclosures, so it
// can be large. Cap it before it goes into the email job (persisted in the
// outbox and Redis, then base64-inflated ~33% at Resend). Above the cap we send
// the acceptance email WITHOUT the attachment — it still carries the Swiss Post
// tracking link, which is the piece the customer cannot get anywhere else.
const MAX_JUSTIFICATIF_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/**
 * Best-effort render of the justificatif d'envoi as an email attachment. Never
 * throws: a rendering failure or an oversized bundle must not block the durable
 * tracking email. Returns `undefined` when no attachment should be sent.
 */
async function buildJustificatifAttachment(
  db: Db,
  draftId: string,
): Promise<SendEmailJob["attachments"]> {
  try {
    const pdf = await buildConfirmationBundlePdf(db, draftId);
    if (pdf.byteLength > MAX_JUSTIFICATIF_ATTACHMENT_BYTES) {
      logger.warn(
        { draftId, bytes: pdf.byteLength },
        "Justificatif too large to attach to acceptance email; sending tracking link only",
      );
      return undefined;
    }
    return [
      {
        filename: `justificatif-envoi-${draftId.slice(0, 8)}.pdf`,
        contentBase64: pdf.toString("base64"),
      },
    ];
  } catch (err) {
    logger.error(
      { draftId, err: err instanceof Error ? err.message : "Unknown error" },
      "Failed to render justificatif for acceptance email; sending tracking link only",
    );
    return undefined;
  }
}

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

  const attachments = await buildJustificatifAttachment(db, args.draftId);

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-accepted",
    locale: context.locale,
    data: {
      ...context,
      providerReference: args.providerReference,
      trackingNumber: args.trackingNumber,
    },
    ...(attachments ? { attachments } : {}),
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
