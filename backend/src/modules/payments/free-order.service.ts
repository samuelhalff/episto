import { eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import type { PaymentBreakdown } from "@episto/shared";
import { syncDraftFulfillmentFromPaymentState } from "../signing/fulfillment.service.js";
import {
  createPaymentAttempt,
  getPaymentForDraft,
  transitionPaymentState,
  type PaymentAttemptRow,
  type PaymentAttribution,
} from "./payment.service.js";
import { recordPromoRedemption } from "./promo.service.js";
import { issueReceiptForCapturedPayment } from "./receipt.service.js";
import { createLogger } from "../../shared/logging/index.js";
import { recordEvent } from "../analytics/index.js";
import { sendGa4Purchase } from "../analytics/ga4-measurement-protocol.js";
import { enqueueDispatchIfEligible } from "./payment-route-helpers.js";
import type { FastifyBaseLogger } from "fastify";

type FreeOrderLogger = Pick<FastifyBaseLogger, "error" | "warn">;

const logger = createLogger("free-order-service");

export interface FreeOrderInput {
  draftId: string;
  sessionId: string;
  email: string;
  promoCodeId: string;
  signatureFlowMode: string;
  verifiedPhone: { phoneE164: string; phoneVerifiedAt: Date };
  orderBreakdown: PaymentBreakdown;
  attribution?: PaymentAttribution | null | undefined;
}

export interface FreeOrderOutcome {
  created: boolean;
  payment: PaymentAttemptRow;
}

/**
 * Capture a fully-discounted (free-promo) order directly, skipping Stripe.
 * Runs in a single transaction and inspects any existing attempt:
 *  - authorised/captured/settling → reuse untouched (payment already in flight);
 *  - a stale pending attempt → cancel it, then capture the free order;
 *  - none/failed/cancelled → capture a fresh free order.
 * Returns `created: false` when an existing order was reused.
 */
export async function captureFreeOrder(
  db: Db,
  input: FreeOrderInput,
): Promise<FreeOrderOutcome> {
  const outcome = await db.transaction(async (tx) => {
    // Serialize concurrent checkouts for the same draft: without this lock two
    // parallel free-order requests could both see "no captured payment", each
    // capture a free order and enqueue dispatch, mailing the letter twice.
    await tx
      .select({ id: schema.draftLetters.id })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, input.draftId))
      .for("update");

    if (input.email) {
      await tx
        .update(schema.sessions)
        .set({ email: input.email, updatedAt: new Date() })
        .where(eq(schema.sessions.id, input.sessionId));
    }

    const existing = await getPaymentForDraft(tx, input.draftId);
    if (
      existing &&
      [
        "authorized",
        "captured",
        "refund_pending",
        "refunded",
        "partially_refunded",
      ].includes(existing.state)
    ) {
      // Order already paid / settling — don't re-process it.
      return { created: false as const, payment: existing };
    }
    // A stale pending attempt is cancelled so the free capture replaces it.
    if (existing && existing.state === "pending") {
      await transitionPaymentState(tx, existing.id, "cancelled");
    }

    const consumed = await recordPromoRedemption(tx, input.promoCodeId);
    if (!consumed) {
      throw new AppError({
        family: "validation_error",
        statusCode: 400,
        code: "PROMO_LIMIT_REACHED",
        message: "Promo code fully redeemed",
        userMessage: "This promo code has reached its limit.",
        userAction: "Remove the code to continue, or try another.",
      });
    }
    const payment = await createPaymentAttempt(tx, {
      draftId: input.draftId,
      sessionId: input.sessionId,
      amountCents: 0,
      verifiedPhoneE164: input.verifiedPhone.phoneE164,
      phoneVerifiedAt: input.verifiedPhone.phoneVerifiedAt,
      breakdown: input.orderBreakdown,
      attribution: input.attribution ?? null,
    });
    // Free (fully-discounted) orders capture locally with no Stripe charge, so
    // there is no processing fee — record the capture time and source only.
    const { payment: captured } = await transitionPaymentState(
      tx,
      payment.id,
      "captured",
      { capturedAt: new Date(), capturedAtSource: "local_capture" },
    );
    await syncDraftFulfillmentFromPaymentState(tx, input.draftId, {
      signatureFlowMode: input.signatureFlowMode,
      paymentState: "captured",
    });
    return { created: true as const, payment: captured };
  });

  // Fire-and-forget receipt issuance after the capture transaction commits.
  // Idempotent + defensive: a receipt failure must never break the free order.
  if (outcome.created) {
    void issueReceiptForCapturedPayment(db, outcome.payment.id).catch((err: unknown) => {
      logger.error(
        { err, paymentAttemptId: outcome.payment.id, draftId: input.draftId },
        "Failed to issue receipt after free-order capture",
      );
    });
  }

  return outcome;
}

/**
 * The whole free-order checkout: capture, dispatch, analytics, response.
 *
 * Lives beside the capture rather than in the route because a CHF 0 order is a
 * complete checkout that happens to touch no payment provider — it has to end
 * in the same state as a paid one. Keeping the two halves apart is how the
 * capture came to be recorded in the funnel only for orders Stripe had seen.
 */
export async function checkoutFreeOrder(
  db: Db,
  input: FreeOrderInput & { deliveryType: string; log: FreeOrderLogger },
): Promise<{
  paymentAttemptId: string;
  clientSecret: null;
  priceCents: number;
  currency: "CHF";
  quote: unknown;
}> {
  const outcome = await captureFreeOrder(db, input);

  await enqueueDispatchIfEligible({
    db,
    draftId: input.draftId,
    paymentId: outcome.payment.id,
    log: input.log,
    failureMessage: "Failed to enqueue dispatch after free-order capture",
    suppressFailure: true,
  });

  if (outcome.created) {
    recordEvent({
      event: "checkout_started",
      draftId: input.draftId,
      deliveryType: input.deliveryType,
      priceCents: 0,
    });
    // The capture happened here, not at a Stripe webhook that will never fire
    // for a CHF 0 order. Without this every promo order looks like an abandoned
    // checkout, which makes a promotion impossible to judge: the campaign that
    // worked and the campaign nobody completed produce the same funnel.
    recordEvent({
      event: "payment_captured",
      draftId: input.draftId,
      paymentAttemptId: outcome.payment.id,
      amountCents: outcome.payment.amountCents,
    });
    // A free order is still a conversion, so it is sent with value 0 rather
    // than skipped. The confirmation page fires its `purchase` for a CHF 0
    // order too; suppressing the server copy would leave the two emitters
    // describing different sets of orders, and de-duplication only works when
    // both sides agree on which transactions exist. Value 0 adds nothing to
    // revenue, which is the correct arithmetic for a fully-discounted order.
    sendGa4Purchase({
      draftId: input.draftId,
      gaClientId: outcome.payment.gaClientId,
      valueCents: outcome.payment.amountCents,
      currency: outcome.payment.currency,
    });
  }

  return {
    paymentAttemptId: outcome.payment.id,
    clientSecret: null,
    priceCents: outcome.payment.amountCents,
    currency: "CHF" as const,
    quote: outcome.created ? input.orderBreakdown : outcome.payment.breakdown,
  };
}
