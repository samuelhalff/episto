import {
  DraftStatus,
  PaymentState,
  DispatchState,
  OrderFulfillmentStatus,
} from "./enums.ts";

import type { DraftStatusValue, OrderFulfillmentStatusValue } from "./enums.ts";
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
  [PaymentState.captured]: [
    PaymentState.refund_pending,
    PaymentState.partially_refunded,
    PaymentState.refunded,
    PaymentState.failed,
  ],
  [PaymentState.failed]: [],
  [PaymentState.cancelled]: [],
  // A failed refund returns to captured (never to `failed`, which means a failed
  // charge). Refunds can complete to partial/full directly from a sync.
  [PaymentState.refund_pending]: [
    PaymentState.captured,
    PaymentState.refunded,
    PaymentState.partially_refunded,
  ],
  [PaymentState.refunded]: [],
  [PaymentState.partially_refunded]: [PaymentState.refund_pending, PaymentState.refunded],
};

// ---------------------------------------------------------------------------
// DispatchState transitions (system-contracts.md §3.3)
// ---------------------------------------------------------------------------

const DISPATCH_TRANSITIONS: Record<DispatchStateValue, readonly DispatchStateValue[]> = {
  // `rejected` straight from `queued` is a *pre-submission* failure: the
  // package could not be assembled, so the provider was never called. Without
  // it the attempt stays queued forever while BullMQ retries something that
  // can never succeed.
  //
  // `unknown` straight from `queued` is an *ambiguous* submission: a worker
  // reached the provider call and never came back to record the outcome. The
  // letter may or may not be at Swiss Post, so it must never be resubmitted
  // automatically — it goes to reconciliation, and failing that to a human.
  [DispatchState.queued]: [
    DispatchState.submitted,
    DispatchState.rejected,
    DispatchState.unknown,
  ],
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
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.signature_not_required]: [
    OrderFulfillmentStatus.payment_authorized,
    OrderFulfillmentStatus.payment_captured,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
  ],
  [OrderFulfillmentStatus.payment_authorized]: [
    OrderFulfillmentStatus.payment_captured,
    OrderFulfillmentStatus.failed,
    OrderFulfillmentStatus.expired,
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
