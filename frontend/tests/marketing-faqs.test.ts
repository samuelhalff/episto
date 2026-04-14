import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

import {
  HELP_FAQ_IDS,
  PRICING_FAQ_IDS,
  buildHelpFaqs,
  buildPricingFaqs,
} from "../src/components/marketing/faq-content";

function getNestedValue(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, source);
}

function createTranslator(messages: Record<string, unknown>) {
  return (key: string) => {
    const value = getNestedValue(messages, key);

    if (typeof value !== "string") {
      throw new Error(`Missing translation for ${key}`);
    }

    return value;
  };
}

const localeMessages = [enCH, deCH, frCH, itCH];

describe("marketing FAQ locale contract", () => {
  it("defines the full help FAQ id list", () => {
    expect(HELP_FAQ_IDS).toHaveLength(12);
    expect(PRICING_FAQ_IDS).toEqual([
      "paymentTiming",
      "priceCoverage",
      "dispatchTiming",
      "editingAfterCheckout",
    ]);
    expect(HELP_FAQ_IDS).toEqual(expect.arrayContaining(PRICING_FAQ_IDS));
  });

  it("builds non-empty FAQ entries for every locale", () => {
    for (const messages of localeMessages) {
      const helpMessages = getNestedValue(messages, "help");

      if (!helpMessages || typeof helpMessages !== "object") {
        throw new Error("Missing help messages");
      }

      const t = createTranslator(helpMessages as Record<string, unknown>);

      for (const faq of buildHelpFaqs(t)) {
        expect(faq.question.trim().length).toBeGreaterThan(0);
        expect(faq.answer.trim().length).toBeGreaterThan(0);
      }

      for (const faq of buildPricingFaqs(t)) {
        expect(faq.question.trim().length).toBeGreaterThan(0);
        expect(faq.answer.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
