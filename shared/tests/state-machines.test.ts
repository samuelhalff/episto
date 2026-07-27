import { describe, it, expect } from "vitest";
import { DraftStatus, PaymentState, DispatchState } from "../src/enums.js";
import {
  canTransitionDraft,
  canTransitionPayment,
  canTransitionDispatch,
  assertTransitionDraft,
  assertTransitionPayment,
  assertTransitionDispatch,
  getAllowedDraftTransitions,
  getAllowedPaymentTransitions,
  getAllowedDispatchTransitions,
} from "../src/state-machines.js";

describe("DraftStatus transitions", () => {
  it("allows the documented primary progression", () => {
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.fields_complete)).toBe(
      true,
    );
    expect(canTransitionDraft(DraftStatus.fields_complete, DraftStatus.reviewed)).toBe(
      true,
    );
    expect(canTransitionDraft(DraftStatus.reviewed, DraftStatus.rendering)).toBe(true);
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.ready)).toBe(true);
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.ready_to_sign)).toBe(
      true,
    );
    expect(canTransitionDraft(DraftStatus.ready, DraftStatus.submitted)).toBe(true);
    expect(canTransitionDraft(DraftStatus.ready_to_sign, DraftStatus.submitted)).toBe(
      true,
    );
    expect(canTransitionDraft(DraftStatus.submitted, DraftStatus.dispatched)).toBe(true);
    expect(canTransitionDraft(DraftStatus.dispatched, DraftStatus.closed)).toBe(true);
  });

  it("allows only the documented backtracking paths", () => {
    expect(canTransitionDraft(DraftStatus.fields_complete, DraftStatus.collecting)).toBe(
      true,
    );
    expect(canTransitionDraft(DraftStatus.ready, DraftStatus.collecting)).toBe(true);
  });

  it("keeps review immutable until rendering starts", () => {
    expect(canTransitionDraft(DraftStatus.reviewed, DraftStatus.fields_complete)).toBe(
      false,
    );
    expect(getAllowedDraftTransitions(DraftStatus.reviewed)).toEqual([
      DraftStatus.rendering,
      DraftStatus.closed,
    ]);
  });

  it("returns rendering drafts to collecting when review preparation must be redone", () => {
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.fields_complete)).toBe(
      false,
    );
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.collecting)).toBe(true);
    expect(getAllowedDraftTransitions(DraftStatus.rendering)).toEqual([
      DraftStatus.collecting,
      DraftStatus.ready,
      DraftStatus.ready_to_sign,
      DraftStatus.closed,
    ]);
  });

  it("routes ready edits back to collecting only", () => {
    expect(canTransitionDraft(DraftStatus.ready, DraftStatus.fields_complete)).toBe(
      false,
    );
    expect(getAllowedDraftTransitions(DraftStatus.ready)).toEqual([
      DraftStatus.submitted,
      DraftStatus.collecting,
      DraftStatus.closed,
    ]);
  });

  it("treats ready_to_sign drafts as a signing hold with the same backtrack rules as ready", () => {
    expect(
      canTransitionDraft(DraftStatus.ready_to_sign, DraftStatus.fields_complete),
    ).toBe(false);
    expect(getAllowedDraftTransitions(DraftStatus.ready_to_sign)).toEqual([
      DraftStatus.submitted,
      DraftStatus.collecting,
      DraftStatus.closed,
    ]);
  });

  it("allows any non-terminal draft state to close", () => {
    const nonTerminal = [
      DraftStatus.collecting,
      DraftStatus.fields_complete,
      DraftStatus.reviewed,
      DraftStatus.rendering,
      DraftStatus.ready,
      DraftStatus.ready_to_sign,
      DraftStatus.submitted,
      DraftStatus.dispatched,
    ] as const;

    for (const status of nonTerminal) {
      expect(canTransitionDraft(status, DraftStatus.closed)).toBe(true);
    }
  });

  it("rejects skips, self-transitions, and terminal re-entry", () => {
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.dispatched)).toBe(
      false,
    );
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.collecting)).toBe(
      false,
    );
    expect(canTransitionDraft(DraftStatus.closed, DraftStatus.collecting)).toBe(false);
    expect(getAllowedDraftTransitions(DraftStatus.closed)).toEqual([]);
  });

  it("assertTransitionDraft enforces the documented graph", () => {
    expect(() =>
      assertTransitionDraft(DraftStatus.collecting, DraftStatus.dispatched),
    ).toThrow("Invalid draft transition");
    expect(() =>
      assertTransitionDraft(DraftStatus.collecting, DraftStatus.fields_complete),
    ).not.toThrow();
  });
});

describe("PaymentState transitions", () => {
  it("allows the documented pending and authorized flows", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.authorized)).toBe(
      true,
    );
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
    expect(canTransitionPayment(PaymentState.pending, PaymentState.failed)).toBe(true);
    expect(canTransitionPayment(PaymentState.pending, PaymentState.cancelled)).toBe(true);
    expect(canTransitionPayment(PaymentState.authorized, PaymentState.captured)).toBe(
      true,
    );
    expect(canTransitionPayment(PaymentState.authorized, PaymentState.cancelled)).toBe(
      true,
    );
    expect(canTransitionPayment(PaymentState.authorized, PaymentState.failed)).toBe(true);
  });

  it("allows refund flow transitions and unrecoverable failure from active states", () => {
    expect(canTransitionPayment(PaymentState.captured, PaymentState.refund_pending)).toBe(
      true,
    );
    expect(canTransitionPayment(PaymentState.captured, PaymentState.failed)).toBe(true);
    // A failed refund goes back to `captured` — `failed` means a failed charge,
    // and the money is still with us.
    expect(getAllowedPaymentTransitions(PaymentState.refund_pending)).toEqual([
      PaymentState.captured,
      PaymentState.refunded,
      PaymentState.partially_refunded,
    ]);
  });

  it("keeps failed terminal, but lets a partial refund be topped up", () => {
    expect(canTransitionPayment(PaymentState.failed, PaymentState.pending)).toBe(false);
    expect(getAllowedPaymentTransitions(PaymentState.failed)).toEqual([]);
    // Partials accumulate: a second refund on the same charge takes it to
    // refund_pending again, and the ledger can settle it as fully refunded.
    expect(getAllowedPaymentTransitions(PaymentState.partially_refunded)).toEqual([
      PaymentState.refund_pending,
      PaymentState.refunded,
    ]);
  });

  it("keeps cancelled and refunded terminal", () => {
    expect(canTransitionPayment(PaymentState.cancelled, PaymentState.authorized)).toBe(
      false,
    );
    expect(canTransitionPayment(PaymentState.refunded, PaymentState.pending)).toBe(false);
    expect(getAllowedPaymentTransitions(PaymentState.cancelled)).toEqual([]);
    expect(getAllowedPaymentTransitions(PaymentState.refunded)).toEqual([]);
  });

  it("supports the documented automatic capture path", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
    expect(canTransitionPayment(PaymentState.captured, PaymentState.refund_pending)).toBe(
      true,
    );
    expect(canTransitionPayment(PaymentState.refund_pending, PaymentState.refunded)).toBe(
      true,
    );
  });

  it("assertTransitionPayment enforces the documented graph", () => {
    expect(() =>
      assertTransitionPayment(PaymentState.pending, PaymentState.refunded),
    ).toThrow("Invalid payment transition");
    expect(() =>
      assertTransitionPayment(PaymentState.pending, PaymentState.authorized),
    ).not.toThrow();
  });
});

describe("DispatchState transitions", () => {
  it("allows the documented submission flow", () => {
    expect(canTransitionDispatch(DispatchState.queued, DispatchState.submitted)).toBe(
      true,
    );
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.accepted)).toBe(
      true,
    );
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.rejected)).toBe(
      true,
    );
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.unknown)).toBe(
      true,
    );
  });

  it("allows only documented reconciliation from unknown", () => {
    expect(getAllowedDispatchTransitions(DispatchState.unknown)).toEqual([
      DispatchState.reconciled,
      DispatchState.accepted,
      DispatchState.rejected,
      DispatchState.unknown,
    ]);
  });

  it("allows polling to remain in unknown while the provider stays ambiguous", () => {
    expect(canTransitionDispatch(DispatchState.unknown, DispatchState.unknown)).toBe(
      true,
    );
  });

  it("keeps accepted, rejected, and reconciled terminal", () => {
    expect(canTransitionDispatch(DispatchState.accepted, DispatchState.reconciled)).toBe(
      false,
    );
    expect(canTransitionDispatch(DispatchState.rejected, DispatchState.submitted)).toBe(
      false,
    );
    expect(canTransitionDispatch(DispatchState.reconciled, DispatchState.queued)).toBe(
      false,
    );
    expect(getAllowedDispatchTransitions(DispatchState.accepted)).toEqual([]);
    expect(getAllowedDispatchTransitions(DispatchState.rejected)).toEqual([]);
    expect(getAllowedDispatchTransitions(DispatchState.reconciled)).toEqual([]);
  });

  it("rejects skipped transitions", () => {
    expect(canTransitionDispatch(DispatchState.queued, DispatchState.accepted)).toBe(
      false,
    );
  });

  it("assertTransitionDispatch enforces the documented graph", () => {
    expect(() =>
      assertTransitionDispatch(DispatchState.queued, DispatchState.reconciled),
    ).toThrow("Invalid dispatch transition");
    expect(() =>
      assertTransitionDispatch(DispatchState.submitted, DispatchState.accepted),
    ).not.toThrow();
  });
});
