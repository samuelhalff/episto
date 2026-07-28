import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SubmitDispatchJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import type { AppError } from "../shared/errors/index.js";
import { isEnclosuresUnavailableError } from "../shared/errors/enclosures-unavailable.js";
import {
  claimDispatchAttempt,
  createDispatchAttempt,
  getDispatchAttemptByPaymentAttemptId,
  markDispatchSubmissionStarted,
  releaseDispatchClaim,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import { enqueueDispatchReconciliation } from "../modules/dispatch/dispatch.jobs.js";
import {
  enqueueDispatchAcceptedEmail,
  enqueueDispatchSubmittedEmail,
  enqueueDispatchFailedEmail,
} from "../modules/dispatch/dispatch-notifications.js";
import { getDispatchAdapter } from "../modules/dispatch/adapters/postal.adapter.js";
import { recordEvent } from "../modules/analytics/index.js";
import { buildDispatchPackage } from "../modules/dispatch/dispatch-package.service.js";
import {
  canFinalizeDispatchResolution,
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission,
} from "./dispatch-settlement.js";
import {
  deferUnknownDispatchOutcome,
  failDispatchNothingSent,
  isProvablyNotSent,
} from "./dispatch-submission-failure.js";

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

  // 1. Create or reuse the queued dispatch attempt, and take the submission
  //    lease. Committed on its own, before anything that can fail.
  //
  //    This used to share a transaction with the package assembly below, and
  //    that was a hole: any assembly failure other than "the enclosures are
  //    gone" rolled the whole thing back, including the insert. After BullMQ
  //    exhausted its retries there was no `dispatch_attempts` row at all — so
  //    the liveness sweep, which looks for exactly that row, could never find
  //    the letter, and a captured payment sat there with nothing recording that
  //    it owed anyone anything.
  //
  //    The deterministic job id keeps the queue from holding two jobs for one
  //    payment, but a *stalled* job can still be re-delivered while this worker
  //    is mid-submission, and the provider call happens outside any
  //    transaction — so the lease is what turns the second worker away, or
  //    Swiss Post posts the letter twice.
  const claimed = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM draft_letters WHERE id = ${draftId} FOR SHARE`);

    const attempt =
      existingAttempt ??
      (await createDispatchAttempt(tx, {
        draftId,
        snapshotId,
        paymentAttemptId: paymentId,
        providerName: capabilities.providerName,
      }));

    return { attempt, lease: await claimDispatchAttempt(tx, attempt.id) };
  });

  const { attempt, lease } = claimed;

  if (lease === null) {
    logger.warn(
      { draftId, snapshotId, paymentId, dispatchId: attempt.id },
      "Skipping dispatch submission: this attempt is claimed or already reached the provider",
    );
    job.log(`Dispatch ${attempt.id} is already being submitted by another worker`);
    return;
  }

  // 2. Assemble the package under a share lock on the draft.
  //
  //    Retention takes `FOR UPDATE` on this same row before it retires
  //    anything (`asset-retention.ts`), so holding the lock for the length of
  //    the assembly is what stops it retiring an enclosure half-way through.
  let dispatchPackage;
  try {
    dispatchPackage = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM draft_letters WHERE id = ${draftId} FOR SHARE`);
      return buildDispatchPackage(tx, draftId, snapshotId, {
        paymentAttemptId: paymentId,
      });
    });
  } catch (err) {
    if (isEnclosuresUnavailableError(err)) {
      // Permanent: the user's own PDF cannot be reconstructed, so no retry will
      // help. Settle it as a rejection and give the money back.
      try {
        await failDispatchNothingSent(
          db,
          { draftId, paymentId, attemptId: attempt.id },
          err as AppError,
        );
      } catch (settleErr) {
        // Nothing was sent, so the lease goes back immediately rather than
        // making the BullMQ retry wait out the TTL.
        await releaseDispatchClaim(db, attempt.id, lease);
        throw settleErr;
      }
      return; // Resolve the job: a retry cannot bring the documents back.
    }

    // Anything else may well be transient — a database blip, storage being
    // briefly unreachable. Nothing has been sent and `submission_started_at` is
    // still null, so a retry is both safe and the right answer. Hand the lease
    // back first so the retry can take it, and let the error out to BullMQ. If
    // the retries run out, the attempt row is committed and the liveness sweep
    // picks it up.
    await releaseDispatchClaim(db, attempt.id, lease);
    throw err;
  }

  // The point of no return. Written *before* the call, because afterwards we
  // may not get the chance: from here on nobody may resubmit this attempt, only
  // reconcile it.
  if (!(await markDispatchSubmissionStarted(db, attempt.id, lease))) {
    logger.warn(
      { draftId, dispatchId: attempt.id },
      "Lost the submission lease before calling the provider; leaving the attempt alone",
    );
    job.log(`Dispatch ${attempt.id} lost its submission lease before submission`);
    return;
  }

  let result;
  try {
    result = await adapter.submit(dispatchPackage);
  } catch (err) {
    // Nothing is re-thrown from here on. We are past the point of no return, so
    // a BullMQ retry cannot resubmit this attempt — it would take the lease,
    // find `submission_started_at` set, and quietly return. Whatever this
    // failure means for the user's money has to be decided here.
    if (isProvablyNotSent(err)) {
      // The adapter guaranteed the letter did not go out, so the user gets
      // their money back on the same path as any other rejection.
      try {
        await failDispatchNothingSent(
          db,
          { draftId, paymentId, attemptId: attempt.id },
          err,
        );
      } catch (settleErr) {
        // The refund failed. The attempt stays `queued` with
        // `submission_started_at` set, which is precisely what the liveness
        // sweep treats as ambiguous: it will flag it `unknown` for review
        // rather than let anyone resubmit it.
        logger.error(
          {
            draftId,
            dispatchId: attempt.id,
            err: settleErr instanceof Error ? settleErr.message : "Unknown error",
          },
          "Provider refused the letter but settling the payment failed; left for the liveness sweep",
        );
      }
      return;
    }

    // Ambiguous: a timeout, an outage, an error we did not anticipate. We do
    // not know whether Swiss Post has the letter, so we neither refund it nor
    // call it sent. It goes to reconciliation, and — when there is no provider
    // reference to reconcile against — to a human.
    await deferUnknownDispatchOutcome(
      db,
      { draftId, paymentId, attemptId: attempt.id },
      err,
    );

    job.log(`Dispatch ${attempt.id} outcome unknown; under review`);
    return;
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

  if (result.state !== "rejected") {
    await enqueueDispatchSubmittedEmail(db, {
      dispatchAttemptId: attempt.id,
      draftId,
      paymentId,
    });
  }

  if (result.state === "accepted" || result.state === "rejected") {
    let settlement: Awaited<
      ReturnType<typeof settlePaymentForDispatchResolution>
    > | null = null;

    try {
      settlement = await settlePaymentForDispatchResolution(
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

    if (result.state === "accepted" && settlement?.payment) {
      try {
        await enqueueDispatchAcceptedEmail(db, {
          dispatchAttemptId: attempt.id,
          draftId,
          paymentId: settlement.payment.id,
          providerReference: result.providerReference ?? null,
          trackingNumber: result.trackingNumber ?? null,
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
          "Failed to enqueue accepted dispatch email after immediate acceptance",
        );
      }
    }

    if (result.state === "rejected" && settlement?.payment) {
      try {
        await enqueueDispatchFailedEmail(db, {
          dispatchAttemptId: attempt.id,
          draftId,
          paymentId: settlement.payment.id,
          failureReason: result.failureReason ?? "Dispatch rejected by provider",
        });
      } catch (failedEmailErr) {
        logger.error(
          {
            draftId,
            dispatchId: attempt.id,
            err:
              failedEmailErr instanceof Error ? failedEmailErr.message : "Unknown error",
          },
          "Failed to enqueue dispatch failure email after provider rejection",
        );
      }
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
}

export function startSubmitDispatchWorker(): Worker<SubmitDispatchJob> {
  return createWorker<SubmitDispatchJob>(
    QUEUE_NAMES.SUBMIT_DISPATCH,
    processSubmitDispatchJob,
    { concurrency: 3 },
  );
}
