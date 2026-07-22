import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FinalCTABand } from "@/components/marketing/FinalCTABand";
import { MarketingSection } from "@/components/marketing/primitives";
import { MarketingBody, MarketingHeading } from "@/components/marketing/typography";
import {
  buildBreadcrumbJsonLd,
  buildMarketingMetadata,
  getSiteUrl,
} from "@/lib/marketing-seo";
import {
  getLandingPages,
  isLandingLocale,
  LANDING_LOCALES,
  LANDING_UI,
} from "@/lib/landing-content";

// The hub only exists for landing locales. See the [slug] route note: under
// next-intl's dynamic rendering this expresses intent but does not by itself
// force a 404 status (soft-404 handled via a middleware follow-up).
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) return {};
  const ui = LANDING_UI[locale];

  return buildMarketingMetadata({
    locale,
    pathname: "/vorlagen",
    title: ui.hubMetaTitle,
    description: ui.hubMetaDescription,
    hreflangLocales: [...LANDING_LOCALES],
  });
}

export default async function VorlagenHubPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();

  const ui = LANDING_UI[locale];
  const pages = getLandingPages(locale);
  const site = getSiteUrl();
  const categories = [...new Set(pages.map((page) => page.category))];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: ui.breadcrumbHome, url: `${site}/${locale}` },
          { name: ui.breadcrumbHub, url: `${site}/${locale}/vorlagen` },
        ])}
      />
      <MarketingLayout>
        <MarketingSection spacing="compact">
          <div className="max-w-3xl">
            <p className="section-label">{ui.hubEyebrow}</p>
            <MarketingHeading
              as="h1"
              tone="hero"
              className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl md:text-5xl"
            >
              {ui.hubTitle}
            </MarketingHeading>
            <MarketingBody
              tone="hero"
              className="mt-5 text-base leading-7 md:text-lg md:leading-8"
            >
              {ui.hubIntro}
            </MarketingBody>
          </div>
        </MarketingSection>

        {categories.map((category) => (
          <MarketingSection key={category} contentClassName="max-w-6xl" spacing="tight">
            <MarketingHeading
              as="h2"
              className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            >
              {category}
            </MarketingHeading>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages
                .filter((page) => page.category === category)
                .map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/vorlagen/${page.slug}`}
                      className="app-panel block h-full rounded-2xl p-5 transition-colors hover:border-[var(--app-border-strong)]"
                    >
                      <MarketingHeading
                        as="h3"
                        className="text-base font-semibold tracking-[-0.01em]"
                      >
                        {page.h1}
                      </MarketingHeading>
                      <MarketingBody tone="muted" className="mt-1.5 text-sm leading-6">
                        {page.metaDescription}
                      </MarketingBody>
                    </Link>
                  </li>
                ))}
            </ul>
          </MarketingSection>
        ))}

        <MarketingSection>
          <FinalCTABand
            title={ui.ctaBandTitle}
            body={ui.ctaBandBody}
            primaryAction={{ href: "/draft/new", label: ui.ctaLabel }}
          />
        </MarketingSection>
      </MarketingLayout>
    </>
  );
}
