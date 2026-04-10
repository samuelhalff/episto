import { describe, expect, it } from "vitest";

import {
  LETTER_COLORS,
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

  it("provides a unified text color for primary letter content", () => {
    expect(LETTER_COLORS.text).toBe("#1a1a1a");
  });
});
