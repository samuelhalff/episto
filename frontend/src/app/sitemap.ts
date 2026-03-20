import type { MetadataRoute } from "next";

const BASE_URL = "https://swissmail.ch";
const LOCALES = ["de-CH", "fr-CH", "it-CH", "en-CH"] as const;

const STATIC_ROUTES = [
  "",
  "/pricing",
  "/how-it-works",
  "/help",
  "/privacy",
  "/terms",
  "/imprint",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    for (const locale of LOCALES) {
      const alternates: Record<string, string> = {};
      for (const alt of LOCALES) {
        alternates[alt] = `${BASE_URL}/${alt}${route}`;
      }

      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : 0.7,
        alternates: { languages: alternates },
      });
    }
  }

  return entries;
}
