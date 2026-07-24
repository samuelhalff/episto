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
} from "./payment.service.js";
import { recordPromoRedemption } from "./promo.service.js";

export interface FreeOrderInput {
  draftId: string;
  sessionId: string;
  email: string;
  promoCodeId: string;
  signatureFlowMode: string;
  verifiedPhone: { phoneE164: string; phoneVerifiedAt: Date };
  orderBreakdown: PaymentBreakdown;
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
  return db.transaction(async (tx) => {
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
    });
    const { payment: captured } = await transitionPaymentState(
      tx,
      payment.id,
      "captured",
    );
    await syncDraftFulfillmentFromPaymentState(tx, input.draftId, {
      signatureFlowMode: input.signatureFlowMode,
      paymentState: "captured",
    });
    return { created: true as const, payment: captured };
  });
}
