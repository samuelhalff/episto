import type { Db } from "../../db/index.js";
import { cancelPaymentIntent } from "./adapters/stripe.adapter.js";
import { getPaymentForDraft, transitionPaymentState } from "./payment.service.js";

export async function cancelPendingDraftPayment(db: Db, draftId: string): Promise<void> {
  await db.transaction(
    async (tx) => {
      const payment = await getPaymentForDraft(tx, draftId);
      if (!payment || payment.state !== "pending" || !payment.stripePaymentIntentId) {
        return;
      }

      await cancelPaymentIntent(payment.stripePaymentIntentId);
      await transitionPaymentState(tx, payment.id, "cancelled");
    },
    { isolationLevel: "serializable" },
  );
}
