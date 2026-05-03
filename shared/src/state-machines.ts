import {
  DraftStatus,
  PaymentState,
  DispatchState,
  SigningState,
  SignatureSessionStatus,
  OrderFulfillmentStatus,
} from "./enums.ts";

import type {
  DraftStatusValue,
  SigningStateValue,
  SignatureSessionStatusValue,
  OrderFulfillmentStatusValue,
} from "./enums.ts";
type PaymentStateValue = (typeof PaymentState)[keyof typeof PaymentState];
type DispatchStateValue = (typeof DispatchState)[keyof typeof DispatchState];

// ---------------------------------------------------------------------------
// DraftStatus transitions (system-contracts.md §3.1)
// ---------------------------------------------------------------------------

const DRAFT_TRANSITIONS: Record<DraftStatusValue, readonly DraftStatusValue[]> = {
  [DraftStatus.collecting]: [DraftStatus.fields_complete, DraftStatus.closed],
  [DraftStatus.fields_complete]: [
    DraftStatus.collecting,
    DraftStatus.reviewed,
    DraftStatus.closed,
  ],
  [DraftStatus.reviewed]: [DraftStatus.rendering, DraftStatus.closed],
  [DraftStatus.rendering]: [
    DraftStatus.collecting,
    DraftStatus.ready,
    DraftStatus.ready_to_sign,
    DraftStatus.closed,
  ],
  [DraftStatus.ready]: [
    DraftStatus.submitted,
    DraftStatus.collecting,
    DraftStatus.closed,
  ],
  [DraftStatus.ready_to_sign]: [
    DraftStatus.submitted,
    DraftStatus.collecting,
    DraftStatus.closed,
  ],
  [DraftStatus.submitted]: [DraftStatus.dispatched, DraftStatus.closed],
  [DraftStatus.dispatched]: [DraftStatus.closed],
  [DraftStatus.closed]: [],
};

// ---------------------------------------------------------------------------
// PaymentState transitions (system-contracts.md §3.2)
// ---------------------------------------------------------------------------

const PAYMENT_TRANSITIONS: Record<PaymentStateValue, readonly PaymentStateValue[]> = {
  [PaymentState.pending]: [
    PaymentState.authorized,
    PaymentState.captured,
    PaymentState.failed,
    PaymentState.cancelled,
  ],
  [PaymentState.authorized]: [
    PaymentState.captured,
    PaymentState.failed,
    PaymentState.cancelled,
  ],
  [PaymentState.captured]: [PaymentState.refund_pending, PaymentState.failed],
  [PaymentState.failed]: [],
  [PaymentState.cancelled]: [],
  [PaymentState.refund_pending]: [
    PaymentState.refunded,
    PaymentState.partially_refunded,
    PaymentState.failed,
  ],
  [PaymentState.refunded]: [],
  [PaymentState.partially_refunded]: [],
};

// ---------------------------------------------------------------------------
// DispatchState transitions (system-contracts.md §3.3)
// ---------------------------------------------------------------------------

const DISPATCH_TRANSITIONS: Record<DispatchStateValue, readonly DispatchStateValue[]> = {
  [DispatchState.queued]: [DispatchState.submitted],
  [DispatchState.submitted]: [
    DispatchState.accepted,
    DispatchState.rejected,
    DispatchState.unknown,
  ],
  [DispatchState.accepted]: [],
  [DispatchState.rejected]: [],
  [DispatchState.unknown]: [
    DispatchState.reconciled,
    DispatchState.accepted,
    DispatchState.rejected,
    DispatchState.unknown,
  ],
  [DispatchState.reconciled]: [],
};

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------

export function canTransitionDraft(
  from: DraftStatusValue,
  to: DraftStatusValue,
): boolean {
  return DRAFT_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(
  from: PaymentStateValue,
  to: PaymentStateValue,
): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionDispatch(
  from: DispatchStateValue,
  to: DispatchStateValue,
): boolean {
  return DISPATCH_TRANSITIONS[from].includes(to);
}

export function assertTransitionDraft(
  from: DraftStatusValue,
  to: DraftStatusValue,
): void {
  if (!canTransitionDraft(from, to)) {
    throw new Error(`Invalid draft transition: ${from} → ${to}`);
  }
}

export function assertTransitionPayment(
  from: PaymentStateValue,
  to: PaymentStateValue,
): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition: ${from} → ${to}`);
  }
}

export function assertTransitionDispatch(
  from: DispatchStateValue,
  to: DispatchStateValue,
): void {
  if (!canTransitionDispatch(from, to)) {
    throw new Error(`Invalid dispatch transition: ${from} → ${to}`);
  }
}

export function getAllowedDraftTransitions(
  from: DraftStatusValue,
): readonly DraftStatusValue[] {
  return DRAFT_TRANSITIONS[from];
}

export function getAllowedPaymentTransitions(
  from: PaymentStateValue,
): readonly PaymentStateValue[] {
  return PAYMENT_TRANSITIONS[from];
}

export function getAllowedDispatchTransitions(
  from: DispatchStateValue,
): readonly DispatchStateValue[] {
  return DISPATCH_TRANSITIONS[from];
}

// ---------------------------------------------------------------------------
// SigningState transitions (see docs/04-product/qualified-signatures.md §State
// machine). Used for both advanced and qualified signatures. Visual-only
// drafts remain in `not_required` for the lifetime of the draft.
// ---------------------------------------------------------------------------

const SIGNING_TRANSITIONS: Record<SigningStateValue, readonly SigningStateValue[]> = {
  [SigningState.not_required]: [
    SigningState.pending_ident,
    SigningState.awaiting_signature,
  ],
  [SigningState.pending_ident]: [
    SigningState.ident_in_progress,
    SigningState.cancelled,
    SigningState.expired,
  ],
  [SigningState.ident_in_progress]: [
    SigningState.ident_verified,
    SigningState.failed,
    SigningState.cancelled,
    SigningState.expired,
  ],
  [SigningState.ident_verified]: [
    SigningState.awaiting_signature,
    SigningState.cancelled,
    SigningState.expired,
  ],
  [SigningState.awaiting_signature]: [
    SigningState.signed,
    SigningState.failed,
    SigningState.cancelled,
    SigningState.expired,
  ],
  [SigningState.signed]: [],
  [SigningState.failed]: [],
  [SigningState.expired]: [],
  [SigningState.cancelled]: [],
};

export function canTransitionSigning(
  from: SigningStateValue,
  to: SigningStateValue,
): boolean {
  return SIGNING_TRANSITIONS[from].includes(to);
}

export function assertTransitionSigning(
  from: SigningStateValue,
  to: SigningStateValue,
): void {
  if (!canTransitionSigning(from, to)) {
    throw new Error(`Invalid signing transition: ${from} → ${to}`);
  }
}

export function getAllowedSigningTransitions(
  from: SigningStateValue,
): readonly SigningStateValue[] {
  return SIGNING_TRANSITIONS[from];
}

// ---------------------------------------------------------------------------
// SignatureSessionStatus transitions
// ---------------------------------------------------------------------------

const SIGNATURE_SESSION_TRANSITIONS: Record<
  SignatureSessionStatusValue,
  readonly SignatureSessionStatusValue[]
> = {
  [SignatureSessionStatus.not_required]: [],
  [SignatureSessionStatus.eligibility_pending]: [
    SignatureSessionStatus.eligibility_confirmed,
    SignatureSessionStatus.failed,
    SignatureSessionStatus.expired,
    SignatureSessionStatus.cancelled,
  ],
  [SignatureSessionStatus.eligibility_confirmed]: [
    SignatureSessionStatus.payment_authorized,
    SignatureSessionStatus.cancelled,
    SignatureSessionStatus.expired,
  ],
  [SignatureSessionStatus.payment_authorized]: [
    SignatureSessionStatus.identity_stepup_started,
    SignatureSessionStatus.signature_session_created,
    SignatureSessionStatus.failed,
    SignatureSessionStatus.expired,
    SignatureSessionStatus.cancelled,
  ],
  [SignatureSessionStatus.identity_stepup_started]: [
    SignatureSessionStatus.signature_session_created,
    SignatureSessionStatus.failed,
    SignatureSessionStatus.expired,
    SignatureSessionStatus.cancelled,
  ],
  [SignatureSessionStatus.signature_session_created]: [
    SignatureSessionStatus.signature_in_progress,
    SignatureSessionStatus.signature_completed,
    SignatureSessionStatus.failed,
    SignatureSessionStatus.expired,
    SignatureSessionStatus.cancelled,
  ],
  [SignatureSessionStatus.signature_in_progress]: [
    SignatureSessionStatus.signature_completed,
    SignatureSessionStatus.failed,
    SignatureSessionStatus.expired,
    SignatureSessionStatus.cancelled,
  ],
  [SignatureSessionStatus.signature_completed]: [
    SignatureSessionStatus.signed_document_attached,
    SignatureSessionStatus.failed,
  ],
  [SignatureSessionStatus.signed_document_attached]: [],
  [SignatureSessionStatus.failed]: [],
  [SignatureSessionStatus.expired]: [],
  [SignatureSessionStatus.cancelled]: [],
};

export function canTransitionSignatureSession(
  from: SignatureSessionStatusValue,
  to: SignatureSessionStatusValue,
): boolean {
  return SIGNATURE_SESSION_TRANSITIONS[from].includes(to);
}

export function assertTransitionSignatureSession(
  from: SignatureSessionStatusValue,
  to: SignatureSessionStatusValue,
): void {
  if (!canTransitionSignatureSession(from, to)) {
    throw new Error(`Invalid signature session transition: ${from} → ${to}`);
  }
}

export function getAllowedSignatureSessionTransitions(
  from: SignatureSessionStatusValue,
): readonly SignatureSessionStatusValue[] {
  return SIGNATURE_SESSION_TRANSITIONS[from];
}

// ---------------------------------------------------------------------------
// OrderFulfillmentStatus transitions
// ---------------------------------------------------------------------------

const FULFILLMENT_TRANSITIONS: Record<
  OrderFulfillmentStatusValue,
  readonly OrderFulfillmentStatusValue[]
> = {
  [OrderFulfillmentStatus.draft_created]: [
    OrderFulfillmentStatus.draft_completed,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.draft_completed]: [
    OrderFulfillmentStatus.preview_ready,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.preview_ready]: [
    OrderFulfillmentStatus.signature_not_required,
    OrderFulfillmentStatus.signature_selected,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_not_required]: [
    OrderFulfillmentStatus.payment_authorized,
    OrderFulfillmentStatus.payment_captured,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_selected]: [
    OrderFulfillmentStatus.signature_eligibility_confirmed,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_eligibility_confirmed]: [
    OrderFulfillmentStatus.payment_authorized,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.payment_authorized]: [
    OrderFulfillmentStatus.identity_stepup_started,
    OrderFulfillmentStatus.signature_session_created,
    OrderFulfillmentStatus.payment_captured,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.identity_stepup_started]: [
    OrderFulfillmentStatus.signature_session_created,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_session_created]: [
    OrderFulfillmentStatus.signature_in_progress,
    OrderFulfillmentStatus.signature_completed,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_in_progress]: [
    OrderFulfillmentStatus.signature_completed,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_completed]: [
    OrderFulfillmentStatus.signed_document_attached,
    OrderFulfillmentStatus.failed,
  ],
  [OrderFulfillmentStatus.signed_document_attached]: [
    OrderFulfillmentStatus.payment_captured,
    OrderFulfillmentStatus.failed,
  ],
  [OrderFulfillmentStatus.payment_captured]: [
    OrderFulfillmentStatus.dispatch_submitted,
    OrderFulfillmentStatus.failed,
  ],
  [OrderFulfillmentStatus.dispatch_submitted]: [
    OrderFulfillmentStatus.dispatch_confirmed,
    OrderFulfillmentStatus.failed,
  ],
  [OrderFulfillmentStatus.dispatch_confirmed]: [OrderFulfillmentStatus.completed],
  [OrderFulfillmentStatus.completed]: [],
  [OrderFulfillmentStatus.failed]: [],
  [OrderFulfillmentStatus.expired]: [],
};

export function canTransitionFulfillment(
  from: OrderFulfillmentStatusValue,
  to: OrderFulfillmentStatusValue,
): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}

export function assertTransitionFulfillment(
  from: OrderFulfillmentStatusValue,
  to: OrderFulfillmentStatusValue,
): void {
  if (!canTransitionFulfillment(from, to)) {
    throw new Error(`Invalid fulfillment transition: ${from} → ${to}`);
  }
}

export function getAllowedFulfillmentTransitions(
  from: OrderFulfillmentStatusValue,
): readonly OrderFulfillmentStatusValue[] {
  return FULFILLMENT_TRANSITIONS[from];
}
