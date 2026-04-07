import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const REQUIRED_DRAFT_KEYS = [
  "phaseProgress",
  "continueToRecipient",
  "continueToContent",
  "continueToAttachments",
  "continueToLogistics",
  "continueToReview",
  "backToIntake",
  "backToSender",
  "backToRecipient",
  "backToContent",
  "backToAttachments",
  "backToSubject",
  "firstDraftReadyTitle",
  "firstDraftReadyBody",
  "firstDraftReadyDismiss",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("draft copy keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const draft = (locale.data as Record<string, Record<string, string>>)["draft"];

      for (const key of REQUIRED_DRAFT_KEYS) {
        it(`has key "${key}"`, () => {
          expect(draft[key]).toBeDefined();
          expect(typeof draft[key]).toBe("string");
          expect(draft[key].length).toBeGreaterThan(0);
        });
      }
    });
  }
});
