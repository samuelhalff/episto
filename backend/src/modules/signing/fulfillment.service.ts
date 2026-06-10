import { eq } from "drizzle-orm";
import {
  assertTransitionFulfillment,
  canTransitionFulfillment,
  OrderFulfillmentStatus,
  type OrderFulfillmentStatusValue,
  type PaymentStateValue,
} from "@episto/shared";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";

export async function getDraftFulfillmentStatus(
  db: Db,
  draftId: string,
): Promise<OrderFulfillmentStatusValue> {
  const [draft] = await db
    .select({ fulfillmentStatus: schema.draftLetters.fulfillmentStatus })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, draftId))
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }

  return draft.fulfillmentStatus;
}

export async function transitionDraftFulfillmentStatus(
  db: Db,
  draftId: string,
  nextStatus: OrderFulfillmentStatusValue,
): Promise<void> {
  const currentStatus = await getDraftFulfillmentStatus(db, draftId);
  if (currentStatus === nextStatus) {
    return;
  }

  assertTransitionFulfillment(currentStatus, nextStatus);

  const updated = await db
    .update(schema.draftLetters)
    .set({
      fulfillmentStatus: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.draftLetters.id, draftId))
    .returning({ id: schema.draftLetters.id });

  if (!updated[0]) {
    throw notFoundError("draft");
  }
}

export async function setInitialDraftFulfillmentStatus(
  db: Db,
  draftId: string,
  _signatureFlowMode: string,
): Promise<void> {
  await transitionDraftFulfillmentStatus(
    db,
    draftId,
    OrderFulfillmentStatus.draft_completed,
  );
  await transitionDraftFulfillmentStatus(
    db,
    draftId,
    OrderFulfillmentStatus.preview_ready,
  );

  await transitionDraftFulfillmentStatus(
    db,
    draftId,
    OrderFulfillmentStatus.signature_not_required,
  );
}

export async function syncDraftFulfillmentFromPaymentState(
  db: Db,
  draftId: string,
  input: {
    signatureFlowMode: string;
    paymentState: PaymentStateValue;
  },
): Promise<void> {
  let target: OrderFulfillmentStatusValue | null = null;

  if (input.paymentState === "captured") {
    target = OrderFulfillmentStatus.payment_captured;
  }

  if (!target) {
    return;
  }

  const currentStatus = await getDraftFulfillmentStatus(db, draftId);
  if (currentStatus === target || !canTransitionFulfillment(currentStatus, target)) {
    return;
  }

  await transitionDraftFulfillmentStatus(db, draftId, target);
}
