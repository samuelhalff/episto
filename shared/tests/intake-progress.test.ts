import { describe, expect, it } from "vitest";

import {
  MIN_INTAKE_CONTEXT_WORDS,
  countIntakeContextWords,
  hasMinimalIntakeContext,
} from "../src/intake-progress";

describe("intake progress helpers", () => {
  it("counts meaningful intake words", () => {
    expect(countIntakeContextWords("Cancel my contract because I am moving abroad next month.")).toBe(10);
  });

  it("requires intent, recipient, and enough narrative context", () => {
    expect(
      hasMinimalIntakeContext({
        intent: "cancellation",
        recipientCompany: "Swisscom AG",
        userContextText:
          "I want to cancel my internet contract because I am moving abroad at the end of June.",
      }),
    ).toBe(true);
  });

  it("stays below the threshold when the intake message is too thin", () => {
    expect(
      hasMinimalIntakeContext({
        intent: "cancellation",
        recipientCompany: "Swisscom AG",
        userContextText: "Cancel Swisscom internet.",
      }),
    ).toBe(false);
  });

  it("stays below the threshold when the recipient is still unknown", () => {
    expect(
      hasMinimalIntakeContext({
        intent: "complaint",
        userContextText:
          "I need to complain about repeated billing errors and want the charges corrected immediately.",
      }),
    ).toBe(false);
  });

  it("exports the canonical minimum word count", () => {
    expect(MIN_INTAKE_CONTEXT_WORDS).toBe(12);
  });
});
