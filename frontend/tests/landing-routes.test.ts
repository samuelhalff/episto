import { describe, expect, it } from "vitest";
import { LANDING_LOCALES, LANDING_SLUGS } from "../src/lib/landing-routes";
import { getLandingPages } from "../src/lib/landing-content";

// The lightweight landing-routes registry is imported by the edge middleware
// (which must not pull in the full landing dataset). These tests guarantee it
// stays in perfect sync with the actual landing pages, so a page added or
// removed without updating landing-routes.ts fails CI instead of silently
// producing a wrong 404 (or a missing one).
describe("landing-routes registry stays in sync with landing content", () => {
  it("LANDING_SLUGS matches the German landing pages exactly (order included)", () => {
    const actual = getLandingPages("de-CH").map((page) => page.slug);
    expect([...LANDING_SLUGS]).toEqual(actual);
  });

  it("every landing locale exposes the same slug set", () => {
    const expected = [...LANDING_SLUGS].sort();
    for (const locale of LANDING_LOCALES) {
      const slugs = getLandingPages(locale)
        .map((page) => page.slug)
        .sort();
      expect(slugs).toEqual(expected);
    }
  });

  it("has no duplicate slugs", () => {
    expect(new Set(LANDING_SLUGS).size).toBe(LANDING_SLUGS.length);
  });
});
