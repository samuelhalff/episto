import { describe, expect, it } from "vitest";

import { resolvePromptShortcutLayout } from "../src/components/product/draft-flow/prompt-shortcut-layout";

const primaryShortcuts = [
  { id: "one", label: "One", prompt: "One", description: "One" },
  { id: "two", label: "Two", prompt: "Two", description: "Two" },
  { id: "three", label: "Three", prompt: "Three", description: "Three" },
];

describe("prompt shortcut layout", () => {
  it("reserves space for More before deciding the final visible shortcut count", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts: [],
      availableWidth: 188,
      leadingWidth: 0,
      moreWidth: 68,
      shortcutWidths: new Map([
        ["one", 52],
        ["two", 56],
        ["three", 64],
      ]),
      gap: 8,
    });

    expect(layout.visiblePrimaryShortcuts.map((shortcut) => shortcut.id)).toEqual(["one"]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["two", "three"]);
  });

  it("keeps deferred primary shortcuts ahead of existing overflow shortcuts", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts: [{ id: "four", label: "Four", prompt: "Four", description: "Four" }],
      availableWidth: 192,
      leadingWidth: 56,
      moreWidth: 68,
      shortcutWidths: new Map([
        ["one", 52],
        ["two", 56],
        ["three", 64],
      ]),
      gap: 8,
    });

    expect(layout.visiblePrimaryShortcuts.map((shortcut) => shortcut.id)).toEqual(["one"]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual([
      "two",
      "three",
      "four",
    ]);
  });

  it("reserves the leading-slot gap before fitting the first shortcut", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts: primaryShortcuts.slice(0, 1),
      overflowShortcuts: [{ id: "four", label: "Four", prompt: "Four", description: "Four" }],
      availableWidth: 128,
      hasLeadingSlot: true,
      moreWidth: 68,
      shortcutWidths: new Map([["one", 52]]),
      gap: 8,
    });

    expect(layout.visiblePrimaryShortcuts).toEqual([]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["one", "four"]);
  });

  it("uses the measured leading badge width before fitting shortcuts", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts: primaryShortcuts.slice(0, 2),
      overflowShortcuts: [],
      availableWidth: 190,
      leadingWidth: 104,
      moreWidth: 68,
      shortcutWidths: new Map([
        ["one", 52],
        ["two", 56],
      ]),
      gap: 8,
    });

    expect(layout.visiblePrimaryShortcuts).toEqual([]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["one", "two"]);
  });
});
