/**
 * Lightweight landing-route registry — just the locales and slugs, no page
 * content. This is the single source of truth for which /vorlagen routes exist,
 * imported by both the landing content module and the edge middleware (which
 * must stay lean and cannot pull in the full landing dataset).
 *
 * `landing-routes.test.ts` asserts these lists stay in sync with the actual
 * landing pages, so a page added/removed without updating this file fails CI.
 */
export const LANDING_LOCALES = ["de-CH", "fr-CH", "it-CH"] as const;
export type LandingLocale = (typeof LANDING_LOCALES)[number];

export const LANDING_SLUGS = [
  "wohnung-kuendigen",
  "einschreiben-online",
  "krankenkasse-kuendigen",
  "abo-kuendigen",
  "arbeitsvertrag-kuendigen",
  "versicherung-kuendigen",
  "handyabo-kuendigen",
  "fitnessabo-kuendigen",
  "beschwerde-schreiben",
  "mahnung-schreiben",
  "einsprache-erheben",
  "mietzins-senken",
  "brief-an-behoerde",
  "brief-online-versenden",
  "nebenkostenabrechnung-pruefen",
] as const;

/**
 * Highest-intent slugs surfaced as internal links (homepage band + 404 page).
 * Must be a subset of LANDING_SLUGS — enforced by landing-routes.test.ts.
 */
export const POPULAR_LANDING_SLUGS = [
  "wohnung-kuendigen",
  "krankenkasse-kuendigen",
  "abo-kuendigen",
  "versicherung-kuendigen",
  "einschreiben-online",
  "beschwerde-schreiben",
] as const;
