import { eq } from "drizzle-orm";

import type { Db } from "../db/index.js";
import { schema } from "../db/index.js";
import { canTransitionFulfillment } from "@episto/shared";
import {
  cancelPaymentIntent,
  capturePaymentIntent,
} from "../modules/payments/adapters/stripe.adapter.js";
import { refundPaymentOnce } from "../modules/payments/refund-once.service.js";
import { syncRefundsForCharge } from "../modules/payments/refund-ledger.service.js";
import {
  getPaymentAttemptById,
  getPaymentForDraft,
  transitionPaymentState,
  type PaymentAttemptRow,
  type TransitionPaymentResult,
} from "../modules/payments/payment.service.js";
import {
  getDraftFulfillmentStatus,
  transitionDraftFulfillmentStatus,
} from "../modules/signing/fulfillment.service.js";
import { createLogger } from "../shared/logging/index.js";

const logger = createLogger("dispatch-settlement");

export type ResolvedDispatchState = "accepted" | "rejected";
export interface DispatchPaymentSettlementResult {
  payment: PaymentAttemptRow | null;
  rawOrderAccessToken: string | null;
}

function isLocalFreeCapture(p: PaymentAttemptRow): boolean {
  return p.amountCents === 0 && !p.stripePaymentIntentId && !p.stripeChargeId;
}

export async function getExactPaymentForDispatch(
  db: Db,
  draftId: string,
  paymentAttemptId: string | null,
): Promise<PaymentAttemptRow | null> {
  if (!paymentAttemptId) {
    // Legacy dispatch_attempts rows may predate payment_attempt_id.
    return getPaymentForDraft(db, draftId);
  }

  const payment = await getPaymentAttemptById(db, paymentAttemptId);
  if (!payment) {
    throw new Error(
      `Payment attempt ${paymentAttemptId} not found for dispatch ${draftId}`,
    );
  }

  if (payment.draftId !== draftId) {
    throw new Error(
      `Payment attempt ${paymentAttemptId} does not belong to draft ${draftId}`,
    );
  }

  return payment;
}

export async function settlePaymentForDispatchResolution(
  db: Db,
  draftId: string,
  paymentAttemptId: string | null,
  resolvedState: ResolvedDispatchState,
): Promise<DispatchPaymentSettlementResult> {
  const payment = await getExactPaymentForDispatch(db, draftId, paymentAttemptId);
  if (!payment) {
    return { payment: null, rawOrderAccessToken: null };
  }

  // --- Authorized state (manual-capture card flow, if ever re-enabled) ---
  if (payment.state === "authorized") {
    if (!payment.stripePaymentIntentId) {
      throw new Error(
        `Authorized payment ${payment.id} is missing a Stripe PaymentIntent id`,
      );
    }

    if (resolvedState === "accepted") {
      const capture = await capturePaymentIntent(payment.stripePaymentIntentId);
      return transitionPaymentState(db, payment.id, "captured", {
        stripeChargeId: capture.chargeId ?? undefined,
      });
    }

    await cancelPaymentIntent(payment.stripePaymentIntentId);
    const result: TransitionPaymentResult = await transitionPaymentState(
      db,
      payment.id,
      "cancelled",
    );
    return result;
  }

  // --- Captured state (automatic-capture: Twint, wallets, cards) ---
  if (payment.state === "captured") {
    if (resolvedState === "accepted") {
      if (payment.amountCents > 0 && !payment.stripePaymentIntentId) {
        logger.error(
          { paymentAttemptId: payment.id, draftId },
          "Captured paid order missing Stripe PaymentIntent at dispatch settlement — data integrity issue; finalizing anyway",
        );
      }
      return { payment, rawOrderAccessToken: null };
    }

    if (isLocalFreeCapture(payment)) {
      return transitionPaymentState(db, payment.id, "refunded", {
        refundReason: "Free order (no charge): dispatch rejected, nothing to refund",
      });
    }

    if (!payment.stripePaymentIntentId) {
      logger.error(
        { paymentAttemptId: payment.id, draftId },
        "Paid order rejected but missing Stripe PaymentIntent — cannot auto-refund; needs manual review",
      );
      throw new Error(
        `Paid payment ${payment.id} rejected but missing a Stripe PaymentIntent id — cannot refund`,
      );
    }

    // Dispatch rejected after capture → refund, through the one door that
    // guarantees a payment is refunded at most once no matter who asks.
    const { refund } = await refundPaymentOnce(db, {
      paymentAttemptId: payment.id,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeChargeId: payment.stripeChargeId,
      reason: `Dispatch rejected for draft ${draftId}`,
      metadata: { paymentAttemptId: payment.id, draftId },
    });
    if (refund?.chargeId) await syncRefundsForCharge(db, refund.chargeId);
    const refreshed = await getPaymentAttemptById(db, payment.id);
    return { payment: refreshed ?? payment, rawOrderAccessToken: null };
  }

  // Other states (pending, failed, cancelled, etc.) — no settlement action
  return { payment, rawOrderAccessToken: null };
}

export function canFinalizeDispatchResolution(
  resolvedState: ResolvedDispatchState,
  payment: PaymentAttemptRow | null,
): boolean {
  if (!payment) {
    return false;
  }

  if (resolvedState === "accepted") {
    return payment.state === "captured";
  }

  return (
    payment.state === "cancelled" ||
    payment.state === "refund_pending" ||
    payment.state === "refunded" ||
    payment.state === "partially_refunded"
  );
}

export async function updateDraftStatusForDispatchResolution(
  db: Db,
  draftId: string,
  resolvedState: ResolvedDispatchState,
  payment: PaymentAttemptRow | null,
): Promise<void> {
  if (resolvedState === "accepted" && payment?.state === "captured") {
    await db
      .update(schema.draftLetters)
      .set({
        status: "dispatched",
        updatedAt: new Date(),
      })
      .where(eq(schema.draftLetters.id, draftId));
    const currentFulfillmentStatus = await getDraftFulfillmentStatus(db, draftId);
    if (canTransitionFulfillment(currentFulfillmentStatus, "dispatch_confirmed")) {
      await transitionDraftFulfillmentStatus(db, draftId, "dispatch_confirmed");
    }
    if (
      canTransitionFulfillment(await getDraftFulfillmentStatus(db, draftId), "completed")
    ) {
      await transitionDraftFulfillmentStatus(db, draftId, "completed");
    }
    return;
  }

  if (
    resolvedState === "rejected" &&
    (payment?.state === "cancelled" ||
      payment?.state === "refund_pending" ||
      payment?.state === "refunded")
  ) {
    await db
      .update(schema.draftLetters)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.draftLetters.id, draftId));
    const currentFulfillmentStatus = await getDraftFulfillmentStatus(db, draftId);
    if (canTransitionFulfillment(currentFulfillmentStatus, "failed")) {
      await transitionDraftFulfillmentStatus(db, draftId, "failed");
    }
  }
}

export async function updateDraftStatusForDispatchSubmission(
  db: Db,
  draftId: string,
  status: "submitted" | "ready" | "dispatched",
): Promise<void> {
  await db
    .update(schema.draftLetters)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(schema.draftLetters.id, draftId));

  if (status === "submitted") {
    const currentFulfillmentStatus = await getDraftFulfillmentStatus(db, draftId);
    if (canTransitionFulfillment(currentFulfillmentStatus, "dispatch_submitted")) {
      await transitionDraftFulfillmentStatus(db, draftId, "dispatch_submitted");
    }
  }
}
