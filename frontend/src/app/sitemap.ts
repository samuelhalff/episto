import type { MetadataRoute } from "next";
import { routing } from "../i18n/routing";
import { LANDING_LOCALES, LANDING_SLUGS } from "../lib/landing-content";
import { getSiteUrl } from "../lib/marketing-seo";

const LOCALES = routing.locales;

const STATIC_ROUTES = [
  "",
  "/pricing",
  "/help",
  "/privacy",
  "/terms",
  "/imprint",
  "/signature-requirements",
] as const;

// Stable content-revision dates (not `new Date()`, which would advertise every
// URL as "just changed" on every crawl and erode lastmod trust). Bump these
// when the corresponding content is meaningfully updated.
const MARKETING_LAST_MODIFIED = new Date("2026-07-22");
const LANDING_LAST_MODIFIED = new Date("2026-07-22");

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: MARKETING_LAST_MODIFIED,
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : 0.7,
      });
    }
  }

  // Landing-page hub + individual lead-gen pages (de/fr/it-CH).
  for (const landingLocale of LANDING_LOCALES) {
    entries.push({
      url: `${baseUrl}/${landingLocale}/vorlagen`,
      lastModified: LANDING_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    for (const slug of LANDING_SLUGS) {
      entries.push({
        url: `${baseUrl}/${landingLocale}/vorlagen/${slug}`,
        lastModified: LANDING_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
