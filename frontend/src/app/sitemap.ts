import type { MetadataRoute } from "next";
import { routing } from "../i18n/routing";
import { getSiteUrl } from "../lib/marketing-seo";

const LOCALES = routing.locales;

const STATIC_ROUTES = [
  "",
  "/pricing",
  "/help",
  "/privacy",
  "/terms",
  "/imprint",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : 0.7,
      });
    }
  }

  return entries;
}
