import { describe, expect, it } from "vitest";
import {
  LANDING_LOCALES,
  LANDING_SLUGS,
  POPULAR_LANDING_SLUGS,
  SERVICE_GUIDE_SLUGS,
  getLandingPageType,
} from "../src/lib/landing-routes";
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

  it("POPULAR_LANDING_SLUGS is a subset of LANDING_SLUGS with no duplicates", () => {
    const all = new Set<string>(LANDING_SLUGS);
    for (const slug of POPULAR_LANDING_SLUGS) {
      expect(all.has(slug)).toBe(true);
    }
    expect(new Set(POPULAR_LANDING_SLUGS).size).toBe(POPULAR_LANDING_SLUGS.length);
  });

  it("service guides are real slugs and are never surfaced as drafting templates", () => {
    const all = new Set<string>(LANDING_SLUGS);
    for (const slug of SERVICE_GUIDE_SLUGS) {
      expect(all.has(slug)).toBe(true);
      expect(getLandingPageType(slug)).toBe("service_guide");
    }
    // The popular (drafting) list must not contain any service guide.
    const guides = new Set<string>(SERVICE_GUIDE_SLUGS);
    for (const slug of POPULAR_LANDING_SLUGS) {
      expect(guides.has(slug)).toBe(false);
      expect(getLandingPageType(slug)).toBe("draft_template");
    }
  });
});
