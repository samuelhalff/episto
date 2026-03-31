import { describe, expect, it } from "vitest";

import { resolvePromptShortcutLayout } from "../src/components/product/draft-flow/prompt-shortcut-layout";

const primaryShortcuts = [
  { id: "one", label: "One", prompt: "One", description: "One" },
  { id: "two", label: "Two", prompt: "Two", description: "Two" },
  { id: "three", label: "Three", prompt: "Three", description: "Three" },
];

const overflowShortcuts = [
  { id: "four", label: "Four", prompt: "Four", description: "Four" },
];

describe("prompt shortcut layout", () => {
  it("keeps all primary shortcuts inline on wide viewports", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts,
      isCompactViewport: false,
      compactPrimaryCount: 1,
    });

    expect(layout.visiblePrimaryShortcuts.map((shortcut) => shortcut.id)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["four"]);
  });

  it("moves excess primary shortcuts into the More sheet on compact viewports", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts,
      isCompactViewport: true,
      compactPrimaryCount: 1,
    });

    expect(layout.visiblePrimaryShortcuts.map((shortcut) => shortcut.id)).toEqual(["one"]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual([
      "two",
      "three",
      "four",
    ]);
  });
});
