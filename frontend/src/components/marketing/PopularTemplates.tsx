import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MarketingSection } from "@/components/marketing/primitives";
import {
  MarketingBody,
  MarketingHeading,
  MarketingMeta,
} from "@/components/marketing/typography";
import {
  getLandingPage,
  isLandingLocale,
  LANDING_UI,
  type LandingPage,
} from "@/lib/landing-content";
import { POPULAR_LANDING_SLUGS } from "@/lib/landing-routes";

// High-intent slugs (shared with the 404 page) that give the lead-gen landing
// pages internal links + crawl depth from the site's strongest page.
const POPULAR_SLUGS = POPULAR_LANDING_SLUGS;

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
            className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
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

      <ul className="mt-8">
        {pages.map((page, index) => (
          <li key={page.slug}>
            <Link
              href={`/vorlagen/${page.slug}`}
              className="hairline group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t py-5 transition-colors first:border-t-0 hover:bg-[var(--app-surface-muted)]"
            >
              <span className="numeral font-mono text-sm text-[var(--app-muted)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <MarketingBody
                as="span"
                tone="emphasis"
                className="text-base font-medium tracking-[-0.01em] group-hover:underline"
              >
                {page.h1}
              </MarketingBody>
              <span className="flex items-center gap-3">
                <MarketingMeta
                  as="span"
                  className="hidden text-xs uppercase tracking-wider sm:inline"
                >
                  {page.category}
                </MarketingMeta>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[var(--app-muted)] transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
