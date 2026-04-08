import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import {
  createWorker,
  QUEUE_NAMES,
  type SubmitDispatchJob,
  type SendEmailJob,
  getQueue,
} from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb, schema } from "../db/index.js";
import {
  createDispatchAttempt,
  getDispatchAttemptByPaymentAttemptId,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import { enqueueDispatchReconciliation } from "../modules/dispatch/dispatch.jobs.js";
import { enqueueDispatchAcceptedEmail } from "../modules/dispatch/dispatch-notifications.js";
import { getDispatchAdapter } from "../modules/dispatch/adapters/postal.adapter.js";
import { recordEvent } from "../modules/analytics/index.js";
import { buildDispatchPackage } from "../modules/dispatch/dispatch-package.service.js";
import { enqueuePaymentReceiptEmail } from "../modules/payments/payment-notifications.js";
import {
  canFinalizeDispatchResolution,
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission,
} from "./dispatch-settlement.js";

const logger = createLogger("submit-dispatch-worker");

/**
 * Submit-dispatch worker — submits a rendered letter to the postal provider.
 *
 * Trigger: Payment authorized.
 * Steps:
 *   1. Create dispatch_attempt record (state: queued)
 *   2. Load snapshot + rendered PDF + recipient details
 *   3. Submit to postal provider via adapter
 *   4. Transition dispatch state to "submitted"
 *   5. Settle payment if the provider returned a terminal result
 *   6. Finalize dispatch/draft state or defer terminalization to reconciliation
 *   7. Enqueue dispatch-submitted notification email
 */
export async function processSubmitDispatchJob(
  job: Job<SubmitDispatchJob>,
): Promise<void> {
  const { draftId, snapshotId, paymentId } = job.data;
  const db = getDb();
  const adapter = getDispatchAdapter();
  const capabilities = adapter.getCapabilities();

  logger.info({ draftId, snapshotId, paymentId }, "Starting dispatch submission");

  const existingAttempt = await getDispatchAttemptByPaymentAttemptId(db, paymentId);
  if (existingAttempt && existingAttempt.state !== "queued") {
    logger.warn(
      {
        draftId,
        snapshotId,
        paymentId,
        dispatchId: existingAttempt.id,
        state: existingAttempt.state,
      },
      "Skipping duplicate dispatch submission for existing payment attempt",
    );
    job.log(`Dispatch already exists for payment ${paymentId}: ${existingAttempt.id}`);
    return;
  }

  // 1. Create or reuse the queued dispatch attempt
  const attempt =
    existingAttempt ??
    (await createDispatchAttempt(db, {
      draftId,
      snapshotId,
      paymentAttemptId: paymentId,
      providerName: capabilities.providerName,
    }));

  const dispatchPackage = await buildDispatchPackage(db, draftId, snapshotId);

  let result;
  try {
    result = await adapter.submit(dispatchPackage);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await transitionDispatchState(db, attempt.id, "rejected", {
      failureReason: message,
    });

    logger.error({ draftId, dispatchId: attempt.id, err: message }, "Dispatch rejected");
    throw err; // Re-throw for BullMQ retry logic
  }

  await transitionDispatchState(db, attempt.id, "submitted", {
    providerReference: result.providerReference ?? undefined,
    trackingNumber: result.trackingNumber ?? undefined,
  });

  recordEvent({
    event: "dispatch_submitted",
    draftId,
    dispatchAttemptId: attempt.id,
    deliveryType: dispatchPackage.deliveryType,
  });

  if (result.state === "accepted" || result.state === "rejected") {
    try {
      const settlement = await settlePaymentForDispatchResolution(
        db,
        draftId,
        paymentId,
        result.state,
      );

      if (!canFinalizeDispatchResolution(result.state, settlement.payment)) {
        throw new Error(
          `Cannot finalize dispatch ${attempt.id} as ${result.state} while payment is ${settlement.payment?.state ?? "missing"}`,
        );
      }

      await updateDraftStatusForDispatchResolution(
        db,
        draftId,
        result.state,
        settlement.payment,
      );

      await transitionDispatchState(db, attempt.id, result.state, {
        providerReference: result.providerReference ?? undefined,
        trackingNumber: result.trackingNumber ?? undefined,
        failureReason: result.failureReason ?? undefined,
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
              draftId,
              dispatchId: attempt.id,
              err: receiptErr instanceof Error ? receiptErr.message : "Unknown error",
            },
            "Failed to enqueue payment receipt email after dispatch settlement",
          );
        }
      }

      if (result.state === "accepted") {
        try {
          await enqueueDispatchAcceptedEmail(db, {
            dispatchAttemptId: attempt.id,
            draftId,
            providerReference: result.providerReference ?? null,
            trackingNumber: result.trackingNumber ?? null,
            rawOrderAccessToken: settlement.rawOrderAccessToken,
          });
        } catch (acceptedEmailErr) {
          logger.error(
            {
              draftId,
              dispatchId: attempt.id,
              err:
                acceptedEmailErr instanceof Error
                  ? acceptedEmailErr.message
                  : "Unknown error",
            },
            "Failed to enqueue accepted dispatch email",
          );
        }
      }
    } catch (err) {
      logger.error(
        {
          draftId,
          dispatchId: attempt.id,
          err: err instanceof Error ? err.message : "Unknown error",
        },
        "Dispatch settlement failed after provider submission; deferring to reconciliation",
      );

      try {
        await updateDraftStatusForDispatchSubmission(db, draftId, "submitted");
      } catch (statusErr) {
        logger.error(
          {
            draftId,
            dispatchId: attempt.id,
            err: statusErr instanceof Error ? statusErr.message : "Unknown error",
          },
          "Failed to keep draft in submitted state while deferring reconciliation",
        );
      }

      try {
        await enqueueDispatchReconciliation({ dispatchAttemptId: attempt.id });
      } catch (reconcileErr) {
        logger.error(
          {
            draftId,
            dispatchId: attempt.id,
            err: reconcileErr instanceof Error ? reconcileErr.message : "Unknown error",
          },
          "Failed to enqueue dispatch reconciliation after settlement failure",
        );
      }

      job.log(`Dispatch settlement deferred for reconciliation: ${attempt.id}`);
      return;
    }
  } else {
    await updateDraftStatusForDispatchSubmission(db, draftId, "submitted");

    try {
      await enqueueDispatchReconciliation({ dispatchAttemptId: attempt.id });
    } catch (reconcileErr) {
      logger.error(
        {
          draftId,
          dispatchId: attempt.id,
          err: reconcileErr instanceof Error ? reconcileErr.message : "Unknown error",
        },
        "Failed to enqueue dispatch reconciliation after non-terminal submission",
      );
    }
  }

  try {
    const [draft] = await db
      .select({ sessionId: schema.draftLetters.sessionId })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, draftId))
      .limit(1);

    const [session] = draft
      ? await db
          .select()
          .from(schema.sessions)
          .where(eq(schema.sessions.id, draft.sessionId))
          .limit(1)
      : [];

    if (session?.email && result.state !== "rejected") {
      const emailQueue = getQueue(QUEUE_NAMES.SEND_EMAIL);
      await emailQueue.add("dispatch-submitted", {
        to: session.email,
        template: "dispatch-submitted",
        locale: session.locale,
        data: { orderRef: draftId },
      } satisfies SendEmailJob);
    }

    logger.info(
      {
        draftId,
        dispatchId: attempt.id,
        ref: result.providerReference,
        state: result.state,
      },
      "Dispatch submission processed",
    );

    job.log(
      `Dispatch processed: ref=${result.providerReference ?? "n/a"} state=${result.state}`,
    );
  } catch (err) {
    logger.error(
      {
        draftId,
        dispatchId: attempt.id,
        err: err instanceof Error ? err.message : "Unknown error",
      },
      "Post-submit follow-up failed",
    );
  }
}

export function startSubmitDispatchWorker(): Worker<SubmitDispatchJob> {
  return createWorker<SubmitDispatchJob>(
    QUEUE_NAMES.SUBMIT_DISPATCH,
    processSubmitDispatchJob,
    { concurrency: 3 },
  );
}
