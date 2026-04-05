import { describe, it, expect } from "vitest";
import {
  DraftStatus,
  PaymentState,
  DispatchState,
} from "../src/enums.js";
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

// ---------------------------------------------------------------------------
// DraftStatus
// ---------------------------------------------------------------------------

describe("DraftStatus transitions", () => {
  it("allows collecting → fields_complete", () => {
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.fields_complete)).toBe(true);
  });

  it("allows fields_complete → collecting (backtrack)", () => {
    expect(canTransitionDraft(DraftStatus.fields_complete, DraftStatus.collecting)).toBe(true);
  });

  it("allows fields_complete → reviewed", () => {
    expect(canTransitionDraft(DraftStatus.fields_complete, DraftStatus.reviewed)).toBe(true);
  });

  it("allows reviewed → rendering", () => {
    expect(canTransitionDraft(DraftStatus.reviewed, DraftStatus.rendering)).toBe(true);
  });

  it("allows reviewed → fields_complete (back to editing)", () => {
    expect(canTransitionDraft(DraftStatus.reviewed, DraftStatus.fields_complete)).toBe(true);
  });

  it("allows rendering → fields_complete (back to editing)", () => {
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.fields_complete)).toBe(true);
  });

  it("allows ready → fields_complete (back to editing)", () => {
    expect(canTransitionDraft(DraftStatus.ready, DraftStatus.fields_complete)).toBe(true);
  });

  it("allows rendering → ready", () => {
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.ready)).toBe(true);
  });

  it("allows rendering → collecting (failure fallback)", () => {
    expect(canTransitionDraft(DraftStatus.rendering, DraftStatus.collecting)).toBe(true);
  });

  it("allows ready → submitted", () => {
    expect(canTransitionDraft(DraftStatus.ready, DraftStatus.submitted)).toBe(true);
  });

  it("allows dispatched → closed", () => {
    expect(canTransitionDraft(DraftStatus.dispatched, DraftStatus.closed)).toBe(true);
  });

  it("rejects collecting → dispatched (skip)", () => {
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.dispatched)).toBe(false);
  });

  it("rejects closed → collecting (terminal)", () => {
    expect(canTransitionDraft(DraftStatus.closed, DraftStatus.collecting)).toBe(false);
  });

  it("rejects self-transition", () => {
    expect(canTransitionDraft(DraftStatus.collecting, DraftStatus.collecting)).toBe(false);
  });

  it("assertTransitionDraft throws on invalid", () => {
    expect(() =>
      assertTransitionDraft(DraftStatus.collecting, DraftStatus.dispatched),
    ).toThrow("Invalid draft transition");
  });

  it("assertTransitionDraft does not throw on valid", () => {
    expect(() =>
      assertTransitionDraft(DraftStatus.collecting, DraftStatus.fields_complete),
    ).not.toThrow();
  });

  it("getAllowedDraftTransitions returns correct list", () => {
    const allowed = getAllowedDraftTransitions(DraftStatus.fields_complete);
    expect(allowed).toEqual([DraftStatus.collecting, DraftStatus.reviewed, DraftStatus.closed]);
  });

  it("any non-terminal state can transition to closed", () => {
    const nonTerminal = [
      DraftStatus.collecting,
      DraftStatus.fields_complete,
      DraftStatus.reviewed,
      DraftStatus.rendering,
      DraftStatus.ready,
      DraftStatus.submitted,
      DraftStatus.dispatched,
    ] as const;
    for (const status of nonTerminal) {
      expect(canTransitionDraft(status, DraftStatus.closed)).toBe(true);
    }
  });

  it("terminal state has no allowed transitions", () => {
    expect(getAllowedDraftTransitions(DraftStatus.closed)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PaymentState
// ---------------------------------------------------------------------------

describe("PaymentState transitions", () => {
  it("allows pending → authorized", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.authorized)).toBe(true);
  });

  it("allows pending → failed", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.failed)).toBe(true);
  });

  it("allows authorized → captured", () => {
    expect(canTransitionPayment(PaymentState.authorized, PaymentState.captured)).toBe(true);
  });

  it("allows captured → refund_pending", () => {
    expect(canTransitionPayment(PaymentState.captured, PaymentState.refund_pending)).toBe(true);
  });

  it("allows refund_pending → refunded", () => {
    expect(canTransitionPayment(PaymentState.refund_pending, PaymentState.refunded)).toBe(true);
  });

  it("allows refund_pending → partially_refunded", () => {
    expect(canTransitionPayment(PaymentState.refund_pending, PaymentState.partially_refunded)).toBe(true);
  });

  it("allows failed → pending (retry)", () => {
    expect(canTransitionPayment(PaymentState.failed, PaymentState.pending)).toBe(true);
  });

  it("allows pending → captured (automatic capture: Twint, Apple Pay, Google Pay)", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
  });

  it("allows the full automatic-capture flow: pending → captured → refund_pending → refunded", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
    expect(canTransitionPayment(PaymentState.captured, PaymentState.refund_pending)).toBe(true);
    expect(canTransitionPayment(PaymentState.refund_pending, PaymentState.refunded)).toBe(true);
  });

  it("rejects refunded → pending (terminal)", () => {
    expect(canTransitionPayment(PaymentState.refunded, PaymentState.pending)).toBe(false);
  });

  it("rejects cancelled → authorized (terminal)", () => {
    expect(canTransitionPayment(PaymentState.cancelled, PaymentState.authorized)).toBe(false);
  });

  it("assertTransitionPayment throws on invalid", () => {
    expect(() =>
      assertTransitionPayment(PaymentState.pending, PaymentState.refunded),
    ).toThrow("Invalid payment transition");
  });

  it("terminal states have no transitions", () => {
    expect(getAllowedPaymentTransitions(PaymentState.cancelled)).toEqual([]);
    expect(getAllowedPaymentTransitions(PaymentState.refunded)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// DispatchState
// ---------------------------------------------------------------------------

describe("DispatchState transitions", () => {
  it("allows queued → submitted", () => {
    expect(canTransitionDispatch(DispatchState.queued, DispatchState.submitted)).toBe(true);
  });

  it("allows submitted → accepted", () => {
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.accepted)).toBe(true);
  });

  it("allows submitted → rejected", () => {
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.rejected)).toBe(true);
  });

  it("allows submitted → unknown", () => {
    expect(canTransitionDispatch(DispatchState.submitted, DispatchState.unknown)).toBe(true);
  });

  it("allows unknown → reconciled", () => {
    expect(canTransitionDispatch(DispatchState.unknown, DispatchState.reconciled)).toBe(true);
  });

  it("allows unknown → accepted (late resolution)", () => {
    expect(canTransitionDispatch(DispatchState.unknown, DispatchState.accepted)).toBe(true);
  });

  it("allows unknown → rejected (late resolution)", () => {
    expect(canTransitionDispatch(DispatchState.unknown, DispatchState.rejected)).toBe(true);
  });

  it("rejects queued → accepted (skip)", () => {
    expect(canTransitionDispatch(DispatchState.queued, DispatchState.accepted)).toBe(false);
  });

  it("rejects rejected → submitted (terminal)", () => {
    expect(canTransitionDispatch(DispatchState.rejected, DispatchState.submitted)).toBe(false);
  });

  it("rejects reconciled → anything (terminal)", () => {
    expect(canTransitionDispatch(DispatchState.reconciled, DispatchState.queued)).toBe(false);
  });

  it("assertTransitionDispatch throws on invalid", () => {
    expect(() =>
      assertTransitionDispatch(DispatchState.queued, DispatchState.reconciled),
    ).toThrow("Invalid dispatch transition");
  });

  it("terminal states have no transitions", () => {
    expect(getAllowedDispatchTransitions(DispatchState.rejected)).toEqual([]);
    expect(getAllowedDispatchTransitions(DispatchState.reconciled)).toEqual([]);
  });
});
