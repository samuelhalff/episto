import { describe, expect, it } from "vitest";

import {
  DEFAULT_SWISS_RECIPIENT_HINTS,
  collectDraftContextHints,
  mergeDictationHints,
} from "../src/modules/drafting/dictation-hints.js";

describe("dictation hinting", () => {
  it("ships a canonical seed vocabulary for important Swiss recipients", () => {
    expect(DEFAULT_SWISS_RECIPIENT_HINTS).toEqual(
      expect.arrayContaining(["Swiss Post", "Migros", "Swisscom"]),
    );
  });

  it("keeps contextual draft hints ahead of the canonical fallback list", () => {
    const contextHints = collectDraftContextHints({
      draft: {
        subject: "Terminate my Fitnesspark membership",
        body:
          "Please cancel my Fitnesspark contract with immediate effect and confirm by post.",
      },
      recipient: {
        company: "Migros Fitnesspark AG",
        firstName: null,
        lastName: null,
        city: "Zurich",
      },
      sender: {
        company: null,
        firstName: "Sam",
        lastName: "Halff",
        city: "Geneva",
      },
    });

    const merged = mergeDictationHints({
      contextHints,
      canonicalHints: ["Swiss Post", "Migros", "Swisscom"],
      maxHints: 6,
    });

    expect(merged[0]).toBe("Migros Fitnesspark AG");
    expect(merged).toContain("Zurich");
    expect(merged).toContain("Sam Halff");
    expect(merged).toContain("Swiss Post");
    expect(merged.filter((hint) => hint === "Migros")).toHaveLength(1);
    expect(merged).toHaveLength(6);
  });
});
