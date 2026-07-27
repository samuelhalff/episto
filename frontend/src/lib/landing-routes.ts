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
  "rechtsvorschlag-erheben",
  "mietmangel-melden",
] as const;

/**
 * Service/how-it-works pages that describe episto's registered-mail service
 * rather than a letter the user drafts. They stay as SEO/GEO pages but must NOT
 * appear as drafting templates (hub grid, popular list) or seed a draft.
 */
export const SERVICE_GUIDE_SLUGS = [
  "einschreiben-online",
  "brief-online-versenden",
] as const;

export type LandingPageType = "draft_template" | "service_guide";

/** Type of a landing slug, or undefined when the slug is not a landing page. */
export function getLandingPageType(slug: string): LandingPageType | undefined {
  if (!(LANDING_SLUGS as readonly string[]).includes(slug)) return undefined;
  return (SERVICE_GUIDE_SLUGS as readonly string[]).includes(slug)
    ? "service_guide"
    : "draft_template";
}

export function isServiceGuideSlug(slug: string): boolean {
  return getLandingPageType(slug) === "service_guide";
}

export function isDraftTemplateSlug(slug: string): boolean {
  return getLandingPageType(slug) === "draft_template";
}

/**
 * Highest-intent DRAFTING templates surfaced as internal links (homepage band +
 * 404 page). Must be a subset of LANDING_SLUGS and contain no service guides —
 * enforced by landing-routes.test.ts.
 */
export const POPULAR_LANDING_SLUGS = [
  "wohnung-kuendigen",
  "krankenkasse-kuendigen",
  "abo-kuendigen",
  "versicherung-kuendigen",
  "beschwerde-schreiben",
  "mahnung-schreiben",
] as const;
