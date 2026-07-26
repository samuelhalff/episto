import { describe, expect, it } from "vitest";
import { intentMatchesAttempt } from "../src/modules/payments/payment-route-helpers.js";

// The webhook uses this to refuse authorizing/capturing an attempt when the
// Stripe intent doesn't match the amount/currency we quoted.
describe("intentMatchesAttempt", () => {
  const attempt = { amountCents: 455, currency: "CHF" };

  it("accepts an exact amount + currency match", () => {
    expect(intentMatchesAttempt({ amount: 455, currency: "chf" }, attempt)).toBe(true);
    expect(intentMatchesAttempt({ amount: 455, currency: "CHF" }, attempt)).toBe(true);
  });

  it("rejects an amount mismatch (tampered/misrouted intent)", () => {
    expect(intentMatchesAttempt({ amount: 100, currency: "chf" }, attempt)).toBe(false);
  });

  it("rejects a currency mismatch", () => {
    expect(intentMatchesAttempt({ amount: 455, currency: "eur" }, attempt)).toBe(false);
  });

  it("rejects missing amount/currency", () => {
    expect(intentMatchesAttempt({ amount: null, currency: "chf" }, attempt)).toBe(false);
    expect(intentMatchesAttempt({ amount: 455, currency: null }, attempt)).toBe(false);
  });
});
