import type {
  DraftFulfillmentStatusResponse,
  OrderStatusDispatch,
  OrderStatusPayment,
} from "@episto/shared";
import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { getDispatchForDraft } from "../dispatch/dispatch.service.js";
import { isMockEpostProviderName } from "../dispatch/adapters/epost-submission-mode.js";
import { getPaymentForDraft } from "../payments/payment.service.js";

function toPaymentResponse(
  payment: Awaited<ReturnType<typeof getPaymentForDraft>>,
): OrderStatusPayment | null {
  if (!payment) {
    return null;
  }

  return {
    state: payment.state as OrderStatusPayment["state"],
    priceCents: payment.amountCents,
    currency: "CHF",
    capturedAt: payment.state === "captured" ? payment.updatedAt.toISOString() : null,
    refundedAt:
      payment.state === "refunded" || payment.state === "partially_refunded"
        ? payment.updatedAt.toISOString()
        : null,
  };
}

function toDispatchResponse(
  dispatch: Awaited<ReturnType<typeof getDispatchForDraft>>,
): OrderStatusDispatch | null {
  if (!dispatch) {
    return null;
  }

  return {
    state: dispatch.state as OrderStatusDispatch["state"],
    providerRef: dispatch.providerReference ?? null,
    providerMode: isMockEpostProviderName(dispatch.providerName) ? "mock" : "live",
    trackingNumber: dispatch.trackingNumber ?? null,
    submittedAt: dispatch.submittedAt?.toISOString() ?? null,
    acceptedAt:
      dispatch.state === "accepted" || dispatch.state === "reconciled"
        ? dispatch.updatedAt.toISOString()
        : null,
    rejectedAt: dispatch.state === "rejected" ? dispatch.updatedAt.toISOString() : null,
    trackingAvailable: Boolean(dispatch.trackingNumber),
    lastCheckedAt: dispatch.lastCheckedAt?.toISOString() ?? null,
  };
}

export function resolveDraftFulfillmentNextAction(input: {
  draftStatus: string;
  signatureFlowMode: string;
  fulfillmentStatus: string;
  payment: OrderStatusPayment | null;
  dispatch: OrderStatusDispatch | null;
}): DraftFulfillmentStatusResponse["fulfillment"]["nextAction"] {
  if (
    !["ready", "ready_to_sign", "submitted", "dispatched", "closed"].includes(
      input.draftStatus,
    )
  ) {
    return input.draftStatus === "rendering" || input.draftStatus === "reviewed"
      ? "review"
      : "continue_editing";
  }

  if (input.dispatch && ["accepted", "reconciled"].includes(input.dispatch.state)) {
    return "view_confirmation";
  }

  if (!input.payment || ["failed", "cancelled"].includes(input.payment.state)) {
    return "checkout";
  }

  return "await_dispatch";
}

export async function buildDraftFulfillmentResponse(
  db: Db,
  draftId: string,
  sessionId: string,
): Promise<DraftFulfillmentStatusResponse> {
  const [draft] = await db
    .select({
      id: schema.draftLetters.id,
      sessionId: schema.draftLetters.sessionId,
      status: schema.draftLetters.status,
      signatureFlowMode: schema.draftLetters.signatureFlowMode,
      fulfillmentStatus: schema.draftLetters.fulfillmentStatus,
    })
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }

  const [payment, dispatch] = await Promise.all([
    getPaymentForDraft(db, draftId),
    getDispatchForDraft(db, draftId),
  ]);

  const paymentResponse = toPaymentResponse(payment);
  const dispatchResponse = toDispatchResponse(dispatch);

  return {
    fulfillment: {
      draftId: draft.id,
      signatureFlowMode: draft.signatureFlowMode,
      fulfillmentStatus: draft.fulfillmentStatus,
      payment: paymentResponse,
      dispatch: dispatchResponse,
      nextAction: resolveDraftFulfillmentNextAction({
        draftStatus: draft.status,
        signatureFlowMode: draft.signatureFlowMode,
        fulfillmentStatus: draft.fulfillmentStatus,
        payment: paymentResponse,
        dispatch: dispatchResponse,
      }),
    },
  };
}
