import { describe, expect, it } from "vitest";

import {
  mergeShortcutIntoComposerValue,
  shouldSendShortcutImmediately,
} from "../src/components/product/draft-flow/prompt-shortcut-behavior";

describe("prompt shortcut behavior", () => {
  it("sends shortcuts immediately only when the composer is empty", () => {
    expect(shouldSendShortcutImmediately("")).toBe(true);
    expect(shouldSendShortcutImmediately("   ")).toBe(true);
    expect(shouldSendShortcutImmediately("Already typing")).toBe(false);
  });

  it("merges a shortcut into existing composer text without deleting it", () => {
    expect(mergeShortcutIntoComposerValue("", "I need to cancel a contract.")).toBe(
      "I need to cancel a contract.",
    );
    expect(
      mergeShortcutIntoComposerValue(
        "I already wrote the company name.",
        "I need to cancel a contract.",
      ),
    ).toBe("I already wrote the company name.\nI need to cancel a contract.");
  });
});
