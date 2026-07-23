import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FinalCTABand } from "@/components/marketing/FinalCTABand";
import { MarketingSection } from "@/components/marketing/primitives";
import {
  MarketingBody,
  MarketingHeading,
  MarketingMeta,
} from "@/components/marketing/typography";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildHowToJsonLd,
  buildMarketingMetadata,
  buildServiceJsonLd,
  getSiteUrl,
} from "@/lib/marketing-seo";
import { getServicePriceBand } from "@/lib/server-pricing";
import {
  getLandingPage,
  isLandingLocale,
  LANDING_LOCALES,
  LANDING_SLUGS,
  LANDING_UI,
  type LandingPage,
  type LandingUi,
} from "@/lib/landing-content";

// Only the pre-generated locale/slug pairs are valid pages. Unknown slugs get a
// genuine 404 from the middleware guard in proxy.ts (which rewrites them before
// this route renders, since next-intl's dynamic rendering makes an in-page
// notFound() return HTTP 200). This flag stays as defense-in-depth / intent.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_LOCALES.flatMap((locale) =>
    LANDING_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = getLandingPage(locale, slug);
  if (!page || !isLandingLocale(locale)) {
    return {};
  }

  return buildMarketingMetadata({
    locale,
    pathname: `/vorlagen/${slug}`,
    title: `${page.metaTitle} | Episto`,
    description: page.metaDescription,
    hreflangLocales: [...LANDING_LOCALES],
  });
}

export default async function LandingPageRoute({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = getLandingPage(locale, slug);
  if (!page || !isLandingLocale(locale)) {
    notFound();
  }

  const ui = LANDING_UI[locale];
  const site = getSiteUrl();
  const pageUrl = `${site}/${locale}/vorlagen/${slug}`;
  const priceBand = await getServicePriceBand();

  return (
    <>
      <JsonLd
        data={[
          buildServiceJsonLd({
            locale,
            title: page.metaTitle,
            description: page.metaDescription,
            pathname: `/vorlagen/${slug}`,
            priceBand,
          }),
          buildHowToJsonLd({
            name: page.h1,
            description: page.quickAnswer,
            steps: page.steps,
          }),
          buildFaqJsonLd(page.faqs),
          buildBreadcrumbJsonLd([
            { name: ui.breadcrumbHome, url: `${site}/${locale}` },
            { name: ui.breadcrumbHub, url: `${site}/${locale}/vorlagen` },
            { name: page.h1, url: pageUrl },
          ]),
        ]}
      />
      <MarketingLayout>
        <LandingHero page={page} ui={ui} />
        <LandingSteps page={page} ui={ui} />
        <LandingChecklistAndNotes page={page} ui={ui} />
        <LandingFaq page={page} ui={ui} />
        <LandingRelated page={page} ui={ui} locale={locale} />
        <MarketingSection spacing="compact" trimTop>
          <MarketingMeta className="max-w-3xl text-xs leading-5">
            {ui.disclaimer}
          </MarketingMeta>
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

function LandingHero({ page, ui }: { page: LandingPage; ui: LandingUi }) {
  return (
    <MarketingSection spacing="compact">
      <nav aria-label="Breadcrumb">
        <MarketingMeta as="ol" className="flex flex-wrap items-center gap-2 text-xs">
          <li>
            <Link href="/" className="hover:underline">
              {ui.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/vorlagen" className="hover:underline">
              {ui.breadcrumbHub}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--app-fg)]">{page.category}</li>
        </MarketingMeta>
      </nav>

      <div className="mt-6 max-w-3xl">
        <p className="section-label">{page.category}</p>
        <MarketingHeading
          as="h1"
          tone="hero"
          className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl md:text-5xl"
        >
          {page.h1}
        </MarketingHeading>

        {/* Definition-first quick answer (above the fold) for GEO. */}
        <div className="letter-sheet mt-6 rounded-[1.5rem] p-6 sm:p-7">
          <p className="section-label">{ui.quickAnswerLabel}</p>
          <MarketingBody className="mt-2 text-base leading-7">
            {page.quickAnswer}
          </MarketingBody>
        </div>

        <div className="mt-7">
          <Link href="/draft/new" className="btn-primary">
            {ui.ctaLabel}
          </Link>
        </div>
      </div>
    </MarketingSection>
  );
}

function LandingSteps({ page, ui }: { page: LandingPage; ui: LandingUi }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" spacing="tight">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="section-label">{ui.stepsEyebrow}</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {ui.stepsTitle}
          </MarketingHeading>
        </div>
        <ol className="relative pl-7 sm:pl-9">
          <span
            aria-hidden="true"
            className="route-rail absolute bottom-3 left-0 top-3 w-[3px] rounded-full"
          />
          {page.steps.map((step, index) => (
            <li
              key={step.title}
              className="hairline grid grid-cols-[auto_1fr] gap-x-5 border-t py-7 first:border-t-0 first:pt-0 sm:gap-x-7"
            >
              <span className="numeral text-3xl font-semibold text-[var(--action-choice-active-fg)] sm:text-4xl dark:text-amber-200/90">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="pt-1">
                <MarketingHeading
                  as="h3"
                  className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
                >
                  {step.title}
                </MarketingHeading>
                <MarketingBody className="mt-2 text-sm leading-6 sm:text-base sm:leading-7">
                  {step.text}
                </MarketingBody>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </MarketingSection>
  );
}

function LandingChecklistAndNotes({ page, ui }: { page: LandingPage; ui: LandingUi }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" muted spacing="tight">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="section-label">{ui.checklistEyebrow}</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {ui.checklistTitle}
          </MarketingHeading>
          <ul className="mt-6">
            {page.checklist.map((item) => (
              <li
                key={item}
                className="hairline flex items-start gap-3 border-t py-3 first:border-t-0 first:pt-0"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  strokeWidth={2}
                />
                <MarketingBody className="text-sm leading-6">{item}</MarketingBody>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="section-label">{ui.notesEyebrow}</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {ui.notesTitle}
          </MarketingHeading>
          <div className="mt-6 space-y-6">
            {page.notes.map((note) => (
              <div
                key={note.title}
                className="hairline border-t pt-6 first:border-t-0 first:pt-0"
              >
                <MarketingHeading
                  as="h3"
                  className="text-base font-semibold tracking-[-0.01em]"
                >
                  {note.title}
                </MarketingHeading>
                <MarketingBody className="mt-2 max-w-prose text-sm leading-7">
                  {note.body}
                </MarketingBody>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingSection>
  );
}

function LandingFaq({ page, ui }: { page: LandingPage; ui: LandingUi }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" spacing="tight">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <MarketingHeading
            as="h2"
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {ui.faqTitle}
          </MarketingHeading>
        </div>
        <div>
          {page.faqs.map((faq) => (
            <details
              key={faq.question}
              className="hairline group border-t py-4 first:border-t-0 first:pt-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60">
                <MarketingBody
                  as="span"
                  tone="emphasis"
                  className="text-base font-semibold tracking-[-0.01em]"
                >
                  {faq.question}
                </MarketingBody>
                <span
                  aria-hidden="true"
                  className="text-[var(--app-muted)] transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <MarketingBody className="mt-3 max-w-2xl text-sm leading-7">
                {faq.answer}
              </MarketingBody>
            </details>
          ))}
        </div>
      </div>
    </MarketingSection>
  );
}

function LandingRelated({
  page,
  ui,
  locale,
}: {
  page: LandingPage;
  ui: LandingUi;
  locale: Locale;
}) {
  const related = page.related
    .map((slug) => getLandingPage(locale, slug))
    .filter((entry): entry is LandingPage => Boolean(entry));

  if (related.length === 0) return null;

  return (
    <MarketingSection contentClassName="max-w-6xl" muted spacing="tight">
      <p className="section-label">{ui.relatedEyebrow}</p>
      <MarketingHeading
        as="h2"
        className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
      >
        {ui.relatedTitle}
      </MarketingHeading>
      <ul className="mt-6">
        {related.map((entry, index) => (
          <li key={entry.slug}>
            <Link
              href={`/vorlagen/${entry.slug}`}
              className="hairline group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t py-4 transition-colors first:border-t-0 hover:bg-[var(--app-surface)]"
            >
              <span className="numeral font-mono text-sm text-[var(--app-muted)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <MarketingBody
                as="span"
                tone="emphasis"
                className="text-base font-medium tracking-[-0.01em] group-hover:underline"
              >
                {entry.h1}
              </MarketingBody>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 text-[var(--app-muted)] transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
