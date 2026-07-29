import { afterEach, describe, expect, it, vi } from "vitest";

import { receiptDedupeKey } from "../src/modules/payments/receipt-notifications.js";

// ---------------------------------------------------------------------------
// How long "we already sent this" lasts, per reason for sending.
//
// The dedupe key is now permanent — it is a UNIQUE column in the email outbox,
// not a Redis job id that ages out in a day. That makes the key a policy
// decision rather than an implementation detail: give the automatic capture
// receipt and an explicit "resend my link" the same identity and the second one
// is silently swallowed forever, so the button reports success and delivers
// nothing. That is the one path a customer whose link stopped working has left.
// ---------------------------------------------------------------------------

const PAYMENT = "payment-1";
const GENERATION = "f7f00e45e1d8db2b1a2465b520aa0bc5";

describe("receiptDedupeKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the automatic capture receipt one identity per generation", () => {
    expect(receiptDedupeKey(PAYMENT, GENERATION, "capture")).toBe(
      receiptDedupeKey(PAYMENT, GENERATION, "capture"),
    );
  });

  /**
   * A replayed Stripe webhook must not mail a second copy of the receipt, and
   * nothing about it changes between deliveries — so the key stays stable and
   * the outbox's unique constraint absorbs it.
   */
  it("keeps the capture receipt free of anything time-varying", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T10:00:00.000Z"));
    const first = receiptDedupeKey(PAYMENT, GENERATION, "capture");
    vi.setSystemTime(new Date("2026-08-30T11:22:33.000Z"));

    expect(receiptDedupeKey(PAYMENT, GENERATION, "capture")).toBe(first);
  });

  it("does not let a customer request collide with the capture receipt", () => {
    expect(receiptDedupeKey(PAYMENT, GENERATION, "customer_request")).not.toBe(
      receiptDedupeKey(PAYMENT, GENERATION, "capture"),
    );
  });

  it("absorbs a double-click within the same minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T10:00:01.000Z"));
    const first = receiptDedupeKey(PAYMENT, GENERATION, "customer_request");
    vi.setSystemTime(new Date("2026-07-29T10:00:59.000Z"));

    expect(receiptDedupeKey(PAYMENT, GENERATION, "customer_request")).toBe(first);
  });

  it("sends again when the customer asks again later", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T10:00:00.000Z"));
    const first = receiptDedupeKey(PAYMENT, GENERATION, "customer_request");
    vi.setSystemTime(new Date("2026-07-29T10:01:00.000Z"));

    expect(receiptDedupeKey(PAYMENT, GENERATION, "customer_request")).not.toBe(first);
  });

  /**
   * Revoking rotates the access token, which moves the generation. The
   * replacement receipt therefore cannot be deduplicated against the one sent at
   * capture even before the trigger is taken into account.
   */
  it("separates generations of the same order", () => {
    expect(receiptDedupeKey(PAYMENT, "aaaa", "capture")).not.toBe(
      receiptDedupeKey(PAYMENT, "bbbb", "capture"),
    );
  });

  it("separates orders", () => {
    expect(receiptDedupeKey("payment-1", GENERATION, "capture")).not.toBe(
      receiptDedupeKey("payment-2", GENERATION, "capture"),
    );
  });
});
