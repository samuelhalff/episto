import { notFound } from "next/navigation";
import { Check } from "lucide-react";
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
import { getLandingPage, LANDING_SLUGS, type LandingPage } from "@/lib/landing-content";

const PAGE_LOCALE: Locale = "de-CH";

export const dynamicParams = false;

export function generateStaticParams() {
  // de-CH only for the first launch; other locales 404 via dynamicParams=false.
  return LANDING_SLUGS.map((slug) => ({ locale: PAGE_LOCALE, slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = getLandingPage(slug);
  if (!page || locale !== PAGE_LOCALE) {
    return {};
  }

  return buildMarketingMetadata({
    locale: PAGE_LOCALE,
    pathname: `/vorlagen/${slug}`,
    title: `${page.metaTitle} | Episto`,
    description: page.metaDescription,
    hreflangLocales: [PAGE_LOCALE],
  });
}

export default async function LandingPageRoute({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = getLandingPage(slug);
  if (!page || locale !== PAGE_LOCALE) {
    notFound();
  }

  const site = getSiteUrl();
  const pageUrl = `${site}/${PAGE_LOCALE}/vorlagen/${slug}`;

  return (
    <>
      <JsonLd
        data={[
          buildServiceJsonLd({
            locale: PAGE_LOCALE,
            title: page.metaTitle,
            description: page.metaDescription,
            pathname: `/vorlagen/${slug}`,
          }),
          buildHowToJsonLd({
            name: page.h1,
            description: page.quickAnswer,
            steps: page.steps,
          }),
          buildFaqJsonLd(page.faqs),
          buildBreadcrumbJsonLd([
            { name: "Start", url: `${site}/${PAGE_LOCALE}` },
            { name: "Vorlagen", url: `${site}/${PAGE_LOCALE}/vorlagen` },
            { name: page.category, url: pageUrl },
          ]),
        ]}
      />
      <MarketingLayout>
        <LandingHero page={page} />
        <LandingSteps page={page} />
        <LandingChecklistAndNotes page={page} />
        <LandingFaq page={page} />
        <LandingRelated page={page} />
        <MarketingSection>
          <FinalCTABand
            title="Bereit, Ihren Brief zu verfassen?"
            body="Beschreiben Sie Ihr Anliegen – Episto schreibt den Brief und versendet ihn, auf Wunsch als Einschreiben."
            primaryAction={{ href: "/draft/new", label: "Brief verfassen" }}
          />
        </MarketingSection>
      </MarketingLayout>
    </>
  );
}

function LandingHero({ page }: { page: LandingPage }) {
  return (
    <MarketingSection spacing="compact">
      <nav aria-label="Breadcrumb">
        <MarketingMeta as="ol" className="flex flex-wrap items-center gap-2 text-xs">
          <li>
            <Link href="/" className="hover:underline">
              Start
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/vorlagen" className="hover:underline">
              Vorlagen
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
          <p className="section-label">Kurz erklärt</p>
          <MarketingBody className="mt-2 text-base leading-7">
            {page.quickAnswer}
          </MarketingBody>
        </div>

        <div className="mt-7">
          <Link href="/draft/new" className="btn-primary">
            Brief verfassen
          </Link>
        </div>
      </div>
    </MarketingSection>
  );
}

function LandingSteps({ page }: { page: LandingPage }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" spacing="tight">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="section-label">So funktioniert es</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            In wenigen Schritten erledigt
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

function LandingChecklistAndNotes({ page }: { page: LandingPage }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" muted spacing="tight">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="section-label">Das gehört in den Brief</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            Checkliste
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
          <p className="section-label">Wichtig in der Schweiz</p>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            Gut zu wissen
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

function LandingFaq({ page }: { page: LandingPage }) {
  return (
    <MarketingSection contentClassName="max-w-6xl" spacing="tight">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <MarketingHeading
            as="h2"
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            Häufige Fragen
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

function LandingRelated({ page }: { page: LandingPage }) {
  const related = page.related
    .map((slug) => getLandingPage(slug))
    .filter((entry): entry is LandingPage => Boolean(entry));

  if (related.length === 0) return null;

  return (
    <MarketingSection contentClassName="max-w-6xl" muted spacing="tight">
      <p className="section-label">Auch hilfreich</p>
      <MarketingHeading
        as="h2"
        className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
      >
        Verwandte Briefe
      </MarketingHeading>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/vorlagen/${entry.slug}`}
              className="app-panel group block h-full rounded-2xl p-5 transition-colors hover:border-[var(--app-border-strong)]"
            >
              <MarketingHeading
                as="h3"
                className="text-base font-semibold tracking-[-0.01em]"
              >
                {entry.h1}
              </MarketingHeading>
              <MarketingBody tone="muted" className="mt-1.5 text-sm leading-6">
                {entry.category}
              </MarketingBody>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}
