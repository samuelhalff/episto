import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MarketingSection } from "@/components/marketing/primitives";
import { MarketingBody, MarketingHeading } from "@/components/marketing/typography";
import {
  getLandingPage,
  isLandingLocale,
  LANDING_UI,
  type LandingPage,
} from "@/lib/landing-content";

// High-intent slugs surfaced on the homepage to give the lead-gen landing pages
// internal links + crawl depth from the site's strongest page.
const POPULAR_SLUGS = [
  "wohnung-kuendigen",
  "krankenkasse-kuendigen",
  "abo-kuendigen",
  "versicherung-kuendigen",
  "einschreiben-online",
  "beschwerde-schreiben",
] as const;

export function PopularTemplates({ locale }: { locale: Locale }) {
  if (!isLandingLocale(locale)) return null;

  const ui = LANDING_UI[locale];
  const pages = POPULAR_SLUGS.map((slug) => getLandingPage(locale, slug)).filter(
    (entry): entry is LandingPage => Boolean(entry),
  );

  if (pages.length === 0) return null;

  return (
    <MarketingSection contentClassName="max-w-6xl" muted spacing="tight">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">{ui.popularEyebrow}</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {ui.popularTitle}
          </MarketingHeading>
        </div>
        <Link
          href="/vorlagen"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-fg)] hover:underline"
        >
          {ui.breadcrumbHub}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/vorlagen/${page.slug}`}
              className="app-panel group block h-full rounded-2xl p-5 transition-colors hover:border-[var(--app-border-strong)]"
            >
              <MarketingHeading
                as="h3"
                className="text-base font-semibold tracking-[-0.01em]"
              >
                {page.h1}
              </MarketingHeading>
              <MarketingBody tone="muted" className="mt-1.5 text-sm leading-6">
                {page.category}
              </MarketingBody>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
