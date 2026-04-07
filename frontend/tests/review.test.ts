import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const REQUIRED_REVIEW_KEYS = [
  "title",
  "subtitle",
  "checklist",
  "senderDetails",
  "recipientDetails",
  "letterBody",
  "subjectLine",
  "signature",
  "attachments",
  "deliveryTypeLabel",
  "deliveryStandard",
  "deliveryRegistered",
  "deliveryStandardBadge",
  "deliveryStandardDescription",
  "deliveryRegisteredBadge",
  "deliveryRegisteredDescription",
  "requiredBeforeSending",
  "pricingPending",
  "pricingLoading",
  "calculatingPrice",
  "calculatingPriceDetail",
  "signatureMissingHelp",
  "attachmentsOptionalHelp",
  "edit",
  "add",
  "proceedToPayment",
  "backToDraft",
  "total",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("review i18n keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const review = (locale.data as Record<string, Record<string, string>>)["review"];

      it("has a review section", () => {
        expect(review).toBeDefined();
      });

      for (const key of REQUIRED_REVIEW_KEYS) {
        it(`has key "${key}"`, () => {
          expect(review[key]).toBeDefined();
          expect(typeof review[key]).toBe("string");
          expect(review[key].length).toBeGreaterThan(0);
        });
      }
    });
  }
});
