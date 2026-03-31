import { describe, expect, it } from "vitest";

import { getBodyShortcutDefinitions } from "../src/components/product/draft-flow/body-shortcuts";

describe("getBodyShortcutDefinitions", () => {
  it("keeps the first-draft inline shortcuts focused on shaping the initial version", () => {
    const { primary } = getBodyShortcutDefinitions({
      hasAttachments: false,
      hasDraftBody: false,
    });

    expect(primary.map((shortcut) => shortcut.id)).toEqual(["confirmation", "deadline"]);
  });

  it("hides the attachments shortcut when no files are present", () => {
    const { overflow } = getBodyShortcutDefinitions({
      hasAttachments: false,
      hasDraftBody: false,
    });

    expect(overflow.some((shortcut) => shortcut.id === "attachments")).toBe(false);
  });

  it("adds the attachments shortcut once supporting files exist", () => {
    const { overflow } = getBodyShortcutDefinitions({
      hasAttachments: true,
      hasDraftBody: false,
    });

    expect(overflow.map((shortcut) => shortcut.id)).toEqual(["attachments"]);
  });

  it("keeps no-content overflow shortcuts away from editing-specific actions", () => {
    const { primary, overflow } = getBodyShortcutDefinitions({
      hasAttachments: false,
      hasDraftBody: false,
    });

    const shortcutIds = [...primary, ...overflow].map((shortcut) => shortcut.id);
    expect(shortcutIds).not.toContain("formal");
    expect(shortcutIds).not.toContain("firmer");
    expect(shortcutIds).not.toContain("direct");
    expect(shortcutIds).not.toContain("softer");
    expect(shortcutIds).not.toContain("opening");
    expect(shortcutIds).not.toContain("closing");
    expect(shortcutIds).not.toContain("shorter");
    expect([...primary, ...overflow].every((shortcut) => shortcut.category === "content")).toBe(true);
  });

  it("switches to refinement-oriented inline shortcuts after a draft already exists", () => {
    const { primary } = getBodyShortcutDefinitions({
      hasAttachments: false,
      hasDraftBody: true,
    });

    expect(primary.map((shortcut) => shortcut.id)).toEqual([
      "formal",
      "shorter",
      "firmer",
      "deadline",
    ]);
  });
});
