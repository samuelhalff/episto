import { describe, expect, it } from "vitest";

import {
  LETTER_COLORS,
  LETTER_LAYOUT_MM,
  LETTER_PAGE_MM,
  mmToPageCqw,
  ptToPageCqw,
} from "../src/letter-layout";

describe("letter layout helpers", () => {
  it("anchors preview scaling to the A4 page width", () => {
    expect(LETTER_PAGE_MM.width).toBe(210);
    expect(LETTER_PAGE_MM.height).toBe(297);
    expect(mmToPageCqw(21)).toBe("10cqw");
  });

  it("converts point sizes to paper-relative cqw units", () => {
    expect(ptToPageCqw(10.5)).toBe("1.7638888888888888cqw");
  });
});

describe("letter color palette", () => {
  it("uses full 6-character hex codes for all colors", () => {
    for (const [key, value] of Object.entries(LETTER_COLORS)) {
      expect(value, `LETTER_COLORS.${key}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("defines a dedicated blue ink token for drawn signatures", () => {
    expect(LETTER_COLORS.signatureDrawnInk).toBe("#1d4ed8");
  });

  it("provides a unified text color for primary letter content", () => {
    expect(LETTER_COLORS.text).toBe("#1a1a1a");
  });
});

/**
 * The address block is load-bearing: if it does not sit in the envelope window,
 * the letter comes back. Nothing asserted these coordinates, so a refactor
 * could have moved them silently. These are the invariants that can be
 * established without an envelope in hand — the physical window check against a
 * Swiss right-window envelope is still an open item (see
 * docs/04-product/a4-template-specification.md §4.1).
 */
describe("recipient address geometry", () => {
  const { recipient, dispatch, rightMeta, sender, body } = LETTER_LAYOUT_MM;

  it("keeps the whole address block clear of the first fold at 99mm", () => {
    // A fold through the address is unreadable to the sorting machine and to
    // the recipient. 99mm is the first of the two A4 letter folds.
    expect(recipient.top + recipient.minHeight).toBeLessThanOrEqual(99);
  });

  it("keeps the address block on the page with a printable right margin", () => {
    expect(recipient.left).toBeGreaterThan(0);
    expect(recipient.left + recipient.width).toBeLessThanOrEqual(
      LETTER_PAGE_MM.width - 10,
    );
  });

  it("does not let the sender block run into the address column", () => {
    expect(sender.left + sender.width).toBeLessThanOrEqual(recipient.left);
  });

  it("stacks the dispatch line, address, and meta block in reading order", () => {
    expect(dispatch.top).toBeLessThan(recipient.top);
    expect(recipient.top + recipient.minHeight).toBeLessThanOrEqual(rightMeta.top);
  });

  it("starts the letter body below the address zone", () => {
    expect(body.paddingTop).toBeGreaterThan(rightMeta.top);
  });
});
