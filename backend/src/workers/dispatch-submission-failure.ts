import type { Db } from "../db/index.js";
import { AppError } from "../shared/errors/index.js";
import { isLetterNotSent } from "../modules/dispatch/dispatch-outcome.js";
import { createLogger } from "../shared/logging/index.js";
import { transitionDispatchState } from "../modules/dispatch/dispatch.service.js";
import { enqueueDispatchReconciliation } from "../modules/dispatch/dispatch.jobs.js";
import { enqueueDispatchFailedEmail } from "../modules/dispatch/dispatch-notifications.js";
import { recordEvent } from "../modules/analytics/index.js";
import {
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission,
} from "./dispatch-settlement.js";

const logger = createLogger("dispatch-submission-failure");

export interface DispatchIds {
  draftId: string;
  paymentId: string;
  attemptId: string;
}

/**
 * Did the letter provably never leave?
 *
 * This is the only question that decides whether the user gets their money
 * back automatically, and the worker does not try to answer it. The adapter
 * marks the failures it knows happened before transmission — its own pre-flight
 * validation, a request it could not assemble, a 400/422 the provider answered
 * with. Anything unmarked is ambiguous: the letter may be in Swiss Post's
 * hands, and refunding it would mean giving the money back for a letter that
 * was posted. Those go to a human instead.
 */
export function isProvablyNotSent(err: unknown): boolean {
  return isLetterNotSent(err);
}

/**
 * End a dispatch where we know nothing was sent.
 *
 * Two ways to get here: the enclosures are gone before we ever call the
 * provider (nothing to re-render — the user's own PDF cannot be
 * reconstructed), or the provider answered and refused the letter. Either way
 * the attempt is rejected and the payment settled on the `rejected` path,
 * which cancels an authorization and refunds a capture.
 */
export async function failDispatchNothingSent(
  db: Db,
  ids: DispatchIds,
  failure: unknown,
): Promise<void> {
  const reason =
    failure instanceof Error
      ? failure.message
      : "Dispatch package could not be assembled";
  const { draftId, paymentId, attemptId } = ids;

  logger.error(
    { draftId, dispatchId: attemptId, reason },
    "Dispatch failed before submission",
  );

  // Money first, state second. Marking the attempt `rejected` before the refund
  // strands the payment if this process dies in between: the submit worker
  // skips attempts that are no longer `queued` and reconciliation ignores
  // `rejected` ones, so nothing would ever come back for it. Leaving it queued
  // means the job simply retries, and settlement is idempotent — the refund
  // carries a stable key, and a cancelled authorization reads as "nothing to
  // do" the second time.
  const settlement = await settlePaymentForDispatchResolution(
    db,
    draftId,
    paymentId,
    "rejected",
  );

  await transitionDispatchState(db, attemptId, "rejected", { failureReason: reason });

  await updateDraftStatusForDispatchResolution(
    db,
    draftId,
    "rejected",
    settlement.payment,
  );

  recordEvent({
    event: "step_error",
    step: "dispatch",
    errorFamily:
      failure instanceof AppError ? failure.family : "retention_cleanup_failure",
    draftId,
  });

  try {
    await enqueueDispatchFailedEmail(db, {
      dispatchAttemptId: attemptId,
      draftId,
      paymentId,
      failureReason: reason,
    });
  } catch (emailErr) {
    logger.error(
      {
        draftId,
        dispatchId: attemptId,
        err: emailErr instanceof Error ? emailErr.message : "Unknown error",
      },
      "Failed to enqueue dispatch failure email after enclosures were unavailable",
    );
  }
}

/**
 * End a dispatch where we cannot tell whether the letter went out.
 *
 * A timeout, an outage, an error we did not anticipate. We neither refund it
 * nor call it sent: the attempt goes to `unknown`, the draft stays `submitted`,
 * and reconciliation — or, when there is no provider reference to reconcile
 * against, a human — decides. Every step is best-effort and logged, because
 * throwing here would only queue a retry that cannot resubmit.
 */
export async function deferUnknownDispatchOutcome(
  db: Db,
  ids: DispatchIds,
  err: unknown,
): Promise<void> {
  const { draftId, attemptId } = ids;
  const message = err instanceof Error ? err.message : "Unknown error";

  logger.error(
    { draftId, dispatchId: attemptId, err: message },
    "Dispatch submission outcome unknown; not resubmitting and not refunding",
  );

  await transitionDispatchState(db, attemptId, "unknown", {
    failureReason: `Submission outcome unknown: ${message}`,
  });

  try {
    await updateDraftStatusForDispatchSubmission(db, draftId, "submitted");
  } catch (statusErr) {
    logger.error(
      {
        draftId,
        dispatchId: attemptId,
        err: statusErr instanceof Error ? statusErr.message : "Unknown error",
      },
      "Failed to move the draft to submitted while deferring an unknown dispatch",
    );
  }

  try {
    await enqueueDispatchReconciliation({ dispatchAttemptId: attemptId });
  } catch (reconcileErr) {
    logger.error(
      {
        draftId,
        dispatchId: attemptId,
        err: reconcileErr instanceof Error ? reconcileErr.message : "Unknown error",
      },
      "Failed to enqueue reconciliation for an unknown dispatch",
    );
  }

  recordEvent({
    event: "step_error",
    step: "dispatch",
    errorFamily: err instanceof AppError ? err.family : "provider_outage",
    draftId,
  });
}
