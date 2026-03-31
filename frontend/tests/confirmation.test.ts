import { describe, it, expect } from "vitest";
import {
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
} from "../src/hooks/use-payment-status";

// ---------------------------------------------------------------------------
// Payment status constants
// ---------------------------------------------------------------------------

describe("PAYMENT_SUCCESS_STATES", () => {
  it("includes authorized and captured", () => {
    expect(PAYMENT_SUCCESS_STATES).toContain("authorized");
    expect(PAYMENT_SUCCESS_STATES).toContain("captured");
  });

  it("does not include failure states", () => {
    expect(PAYMENT_SUCCESS_STATES).not.toContain("failed");
    expect(PAYMENT_SUCCESS_STATES).not.toContain("cancelled");
  });
});

describe("PAYMENT_FAILURE_STATES", () => {
  it("includes failed and cancelled", () => {
    expect(PAYMENT_FAILURE_STATES).toContain("failed");
    expect(PAYMENT_FAILURE_STATES).toContain("cancelled");
  });

  it("does not include success states", () => {
    expect(PAYMENT_FAILURE_STATES).not.toContain("authorized");
    expect(PAYMENT_FAILURE_STATES).not.toContain("captured");
  });
});

// ---------------------------------------------------------------------------
// Confirmation page i18n keys — all 4 locales must define them
// ---------------------------------------------------------------------------

import enCH from "../src/messages/en-CH.json";
import deCH from "../src/messages/de-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const REQUIRED_CONFIRMATION_KEYS = [
  "title",
  "subtitle",
  "queuedSubtitle",
  "submittedSubtitle",
  "acceptedSubtitle",
  "rejectedSubtitle",
  "unknownSubtitle",
  "verifying",
  "paymentFailed",
  "paymentFailedSubtitle",
  "backToCheckout",
  "orderReference",
  "copied",
  "copyReference",
  "dispatchTitle",
  "whatHappensNext",
  "stepPayment",
  "stepPaymentDetail",
  "stepSubmitted",
  "stepSubmittedDetail",
  "stepProcessing",
  "stepProcessingDetail",
  "stepUpdates",
  "stepUpdatesDetail",
  "downloadReceipt",
  "viewLetter",
  "sendAnother",
  "stateQueued",
  "stateSubmitted",
  "stateAccepted",
  "stateRejected",
  "stateUnknown",
  "emailNotice",
  "emailNoticeDetail",
  "stickyCtaLabel",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("confirmation i18n keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const confirmation = (locale.data as Record<string, Record<string, string>>)[
        "confirmation"
      ];

      it("has a confirmation section", () => {
        expect(confirmation).toBeDefined();
      });

      for (const key of REQUIRED_CONFIRMATION_KEYS) {
        it(`has key "${key}"`, () => {
          expect(confirmation[key]).toBeDefined();
          expect(typeof confirmation[key]).toBe("string");
          expect(confirmation[key].length).toBeGreaterThan(0);
        });
      }
    });
  }

  it("all locales define the same set of keys", () => {
    const enKeys = Object.keys(
      (enCH as Record<string, Record<string, string>>)["confirmation"],
    ).sort();
    for (const locale of [deCH, frCH, itCH]) {
      const keys = Object.keys(
        (locale as Record<string, Record<string, string>>)["confirmation"],
      ).sort();
      expect(keys).toEqual(enKeys);
    }
  });
});
