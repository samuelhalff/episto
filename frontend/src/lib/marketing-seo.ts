import type { Metadata } from "next";
import { routing } from "../i18n/routing";
import { BRAND_NAME } from "./brand";
import { env } from "./env";

type Locale = (typeof routing.locales)[number];

type MarketingMetadataInput = {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
  /**
   * Locales to advertise via hreflang. Defaults to all site locales; pass a
   * subset for pages that only exist in some locales (e.g. de-CH-only landing
   * pages) so hreflang never points at a 404.
   */
  hreflangLocales?: Locale[];
};

type FaqItem = {
  question: string;
  answer: string;
};

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function getSiteUrl() {
  return env.NEXT_PUBLIC_SITE_URL;
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function buildLocaleUrl(locale: Locale, pathname: string) {
  return `${getSiteUrl()}/${locale}${normalizePathname(pathname)}`;
}

export function buildMarketingMetadata({
  locale,
  pathname,
  title,
  description,
  hreflangLocales,
}: MarketingMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = buildLocaleUrl(locale, pathname);
  const alternateLocales = hreflangLocales ?? [...routing.locales];
  const languages = Object.fromEntries(
    alternateLocales.map((candidateLocale) => [
      candidateLocale,
      buildLocaleUrl(candidateLocale, pathname),
    ]),
  );
  const xDefaultLocale = alternateLocales.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : (alternateLocales[0] ?? routing.defaultLocale);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...languages,
        "x-default": buildLocaleUrl(xDefaultLocale, pathname),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: getSiteUrl(),
    areaServed: "CH",
    availableLanguage: [...routing.locales],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: getSiteUrl(),
    inLanguage: [...routing.locales],
  };
}

export function buildServiceJsonLd({
  locale,
  title,
  description,
  pathname = "",
}: {
  locale: Locale;
  title: string;
  description: string;
  pathname?: string | undefined;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description,
    url: buildLocaleUrl(locale, pathname),
    areaServed: "CH",
    availableLanguage: locale,
    provider: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: getSiteUrl(),
    },
  };
}

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

export function buildHowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Array<{ title: string; text: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
