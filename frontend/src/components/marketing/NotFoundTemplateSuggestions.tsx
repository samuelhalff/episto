"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getLandingPage,
  isLandingLocale,
  LANDING_UI,
  type LandingPage,
} from "@/lib/landing-content";
import { POPULAR_LANDING_SLUGS } from "@/lib/landing-routes";

/**
 * Popular-template links for the 404 pages. A visitor hitting a 404 most likely
 * mistyped or followed a stale /vorlagen link, so surfacing the highest-intent
 * templates + the hub recovers the lead instead of dead-ending on the generic
 * CTAs. Renders nothing for non-landing locales (e.g. en-CH).
 *
 * Uses `next/link` with explicit locale-prefixed hrefs so it works both inside
 * the next-intl provider ([locale]/not-found) and outside it (root not-found).
 */
export function NotFoundTemplateSuggestions({ locale }: { locale: string }) {
  if (!isLandingLocale(locale)) return null;

  const ui = LANDING_UI[locale];
  const pages = POPULAR_LANDING_SLUGS.map((slug) => getLandingPage(locale, slug)).filter(
    (page): page is LandingPage => Boolean(page),
  );
  if (pages.length === 0) return null;

  return (
    <div className="mt-8 w-full border-t border-[var(--app-border)] pt-6 text-left">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {ui.popularTitle}
      </p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/${locale}/vorlagen/${page.slug}`}
              className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {page.h1}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/${locale}/vorlagen`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
      >
        {ui.breadcrumbHub}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}
