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
      <div>
        <p className="section-label">{ui.popularEyebrow}</p>
        <MarketingHeading
          as="h2"
          className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
        >
          {ui.popularTitle}
        </MarketingHeading>
      </div>

      <ul className="mt-10 grid gap-x-12 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.slug} className="hairline border-t">
            <Link href={`/vorlagen/${page.slug}`} className="group block py-6">
              <MarketingMeta as="span" className="block text-xs tracking-normal">
                {page.category}
              </MarketingMeta>
              <span className="mt-2 flex items-baseline justify-between gap-4">
                <MarketingHeading
                  as="span"
                  className="text-lg font-semibold tracking-[-0.02em] group-hover:underline"
                >
                  {page.h1}
                </MarketingHeading>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 translate-y-1 text-[var(--app-muted)] transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <MarketingBody
                as="span"
                className="mt-2 block max-w-md text-sm leading-6 line-clamp-2"
              >
                {page.metaDescription}
              </MarketingBody>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Link
          href="/vorlagen"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-fg)] underline underline-offset-4 hover:no-underline"
        >
          {ui.breadcrumbHub}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </MarketingSection>
  );
}
