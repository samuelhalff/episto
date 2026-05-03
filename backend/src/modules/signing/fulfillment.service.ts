import { eq } from "drizzle-orm";
import {
  assertTransitionFulfillment,
  canTransitionFulfillment,
  OrderFulfillmentStatus,
  type OrderFulfillmentStatusValue,
  type PaymentStateValue,
  type SignatureSessionStatusValue,
} from "@episto/shared";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { isSwissSignFlowMode } from "./signature-flow.js";

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
  signatureFlowMode: string,
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

  if (signatureFlowMode === "visual" || signatureFlowMode === "none") {
    await transitionDraftFulfillmentStatus(
      db,
      draftId,
      OrderFulfillmentStatus.signature_not_required,
    );
    return;
  }

  await transitionDraftFulfillmentStatus(
    db,
    draftId,
    OrderFulfillmentStatus.signature_selected,
  );
}

function getFulfillmentTargetForSignatureSessionStatus(
  status: SignatureSessionStatusValue,
): OrderFulfillmentStatusValue | null {
  switch (status) {
    case "eligibility_confirmed":
      return OrderFulfillmentStatus.signature_eligibility_confirmed;
    case "payment_authorized":
      return OrderFulfillmentStatus.payment_authorized;
    case "identity_stepup_started":
      return OrderFulfillmentStatus.identity_stepup_started;
    case "signature_session_created":
      return OrderFulfillmentStatus.signature_session_created;
    case "signature_in_progress":
      return OrderFulfillmentStatus.signature_in_progress;
    case "signature_completed":
      return OrderFulfillmentStatus.signature_completed;
    case "signed_document_attached":
      return OrderFulfillmentStatus.signed_document_attached;
    default:
      return null;
  }
}

export async function syncDraftFulfillmentFromSignatureSessionStatus(
  db: Db,
  draftId: string,
  status: SignatureSessionStatusValue,
): Promise<void> {
  const target = getFulfillmentTargetForSignatureSessionStatus(status);
  if (!target) {
    return;
  }

  const currentStatus = await getDraftFulfillmentStatus(db, draftId);
  if (currentStatus === target || !canTransitionFulfillment(currentStatus, target)) {
    return;
  }

  await transitionDraftFulfillmentStatus(db, draftId, target);
}

export async function syncDraftFulfillmentFromPaymentState(
  db: Db,
  draftId: string,
  input: {
    signatureFlowMode: string;
    paymentState: PaymentStateValue;
    signatureSessionStatus?: SignatureSessionStatusValue | null;
  },
): Promise<void> {
  let target: OrderFulfillmentStatusValue | null = null;

  if (
    input.paymentState === "authorized" &&
    isSwissSignFlowMode(input.signatureFlowMode)
  ) {
    target = OrderFulfillmentStatus.payment_authorized;
  }

  if (input.paymentState === "captured") {
    if (!isSwissSignFlowMode(input.signatureFlowMode)) {
      target = OrderFulfillmentStatus.payment_captured;
    } else if (input.signatureSessionStatus === "signed_document_attached") {
      target = OrderFulfillmentStatus.payment_captured;
    }
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
