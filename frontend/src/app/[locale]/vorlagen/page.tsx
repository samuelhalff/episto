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

// The hub only exists for landing locales; other locales get a genuine 404 from
// the middleware guard in proxy.ts (see the [slug] route note). Defense-in-depth.
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
              className="mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl md:text-5xl"
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

        <MarketingSection contentClassName="max-w-6xl" spacing="compact">
          <div className="space-y-14 sm:space-y-16 lg:space-y-20">
            {categories.map((category) => {
              const items = pages.filter((page) => page.category === category);
              // Sparse categories (≤2 entries) render as a ruled list instead of a
              // card grid, so single items don't leave two empty columns behind.
              const useGrid = items.length >= 3;

              return (
                <div key={category}>
                  <MarketingHeading
                    as="h2"
                    className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                  >
                    {category}
                  </MarketingHeading>
                  {useGrid ? (
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((page) => (
                        <li key={page.slug}>
                          <Link
                            href={`/vorlagen/${page.slug}`}
                            className="app-panel flex h-full flex-col rounded-2xl p-5 transition-colors hover:border-[var(--app-border-strong)]"
                          >
                            <MarketingHeading
                              as="h3"
                              className="text-base font-semibold tracking-[-0.01em]"
                            >
                              {page.h1}
                            </MarketingHeading>
                            <MarketingBody
                              tone="muted"
                              className="mt-1.5 text-sm leading-6"
                            >
                              {page.metaDescription}
                            </MarketingBody>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="mt-6">
                      {items.map((page) => (
                        <li key={page.slug}>
                          <Link
                            href={`/vorlagen/${page.slug}`}
                            className="hairline group -mx-4 block border-t px-4 py-5 transition-colors first:border-t-0 first:pt-0 hover:bg-[var(--app-surface-muted)]"
                          >
                            <MarketingHeading
                              as="h3"
                              className="text-base font-semibold tracking-[-0.01em] group-hover:underline"
                            >
                              {page.h1}
                            </MarketingHeading>
                            <MarketingBody
                              tone="muted"
                              className="mt-1.5 max-w-2xl text-sm leading-6"
                            >
                              {page.metaDescription}
                            </MarketingBody>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </MarketingSection>

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
