import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const REQUIRED_CHECKOUT_KEYS = [
  "title",
  "orderSummary",
  "checkoutIntro",
  "email",
  "emailHelp",
  "consentRequired",
  "legalConsent",
  "sendMyLetter",
  "securedByStripe",
  "swissDelivery",
  "dataProtection",
  "defaultLetterTitle",
  "draftingIncluded",
  "delivery",
  "deliveryStandardLabel",
  "deliveryRegisteredLabel",
  "secureCheckout",
  "paymentHelp",
  "total",
  "paymentConfirming",
  "paymentError",
  "enterPaymentDetails",
  "continueToPayment",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("checkout i18n keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const checkout = (locale.data as Record<string, Record<string, string>>)[
        "checkout"
      ];

      it("has a checkout section", () => {
        expect(checkout).toBeDefined();
      });

      for (const key of REQUIRED_CHECKOUT_KEYS) {
        it(`has key "${key}"`, () => {
          expect(checkout[key]).toBeDefined();
          expect(typeof checkout[key]).toBe("string");
          expect(checkout[key].length).toBeGreaterThan(0);
        });
      }
    });
  }
});
