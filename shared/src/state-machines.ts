import { DraftStatus, PaymentState, DispatchState } from "./enums.ts";

import type { DraftStatusValue } from "./enums.ts";
type PaymentStateValue = (typeof PaymentState)[keyof typeof PaymentState];
type DispatchStateValue = (typeof DispatchState)[keyof typeof DispatchState];

// ---------------------------------------------------------------------------
// DraftStatus transitions (system-contracts.md §3.1)
// ---------------------------------------------------------------------------

const DRAFT_TRANSITIONS: Record<DraftStatusValue, readonly DraftStatusValue[]> =
  {
    [DraftStatus.collecting]: [DraftStatus.fields_complete, DraftStatus.closed],
    [DraftStatus.fields_complete]: [
      DraftStatus.collecting,
      DraftStatus.reviewed,
      DraftStatus.closed,
    ],
    [DraftStatus.reviewed]: [DraftStatus.rendering, DraftStatus.closed],
    [DraftStatus.rendering]: [DraftStatus.ready, DraftStatus.collecting, DraftStatus.closed],
    [DraftStatus.ready]: [DraftStatus.submitted, DraftStatus.collecting, DraftStatus.closed],
    [DraftStatus.submitted]: [DraftStatus.dispatched, DraftStatus.closed],
    [DraftStatus.dispatched]: [DraftStatus.closed],
    [DraftStatus.closed]: [],
  };

// ---------------------------------------------------------------------------
// PaymentState transitions (system-contracts.md §3.2)
// ---------------------------------------------------------------------------

const PAYMENT_TRANSITIONS: Record<
  PaymentStateValue,
  readonly PaymentStateValue[]
> = {
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
  ],
  [PaymentState.failed]: [PaymentState.pending],
  [PaymentState.cancelled]: [],
  [PaymentState.refund_pending]: [
    PaymentState.refunded,
    PaymentState.partially_refunded,
    PaymentState.captured,
  ],
  [PaymentState.refunded]: [],
  [PaymentState.partially_refunded]: [PaymentState.refund_pending],
};

// ---------------------------------------------------------------------------
// DispatchState transitions (system-contracts.md §3.3)
// ---------------------------------------------------------------------------

const DISPATCH_TRANSITIONS: Record<
  DispatchStateValue,
  readonly DispatchStateValue[]
> = {
  [DispatchState.queued]: [DispatchState.submitted],
  [DispatchState.submitted]: [
    DispatchState.accepted,
    DispatchState.rejected,
    DispatchState.unknown,
  ],
  [DispatchState.accepted]: [DispatchState.reconciled],
  [DispatchState.rejected]: [],
  [DispatchState.unknown]: [
    DispatchState.reconciled,
    DispatchState.accepted,
    DispatchState.rejected,
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
    throw new Error(
      `Invalid draft transition: ${from} → ${to}`,
    );
  }
}

export function assertTransitionPayment(
  from: PaymentStateValue,
  to: PaymentStateValue,
): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(
      `Invalid payment transition: ${from} → ${to}`,
    );
  }
}

export function assertTransitionDispatch(
  from: DispatchStateValue,
  to: DispatchStateValue,
): void {
  if (!canTransitionDispatch(from, to)) {
    throw new Error(
      `Invalid dispatch transition: ${from} → ${to}`,
    );
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
