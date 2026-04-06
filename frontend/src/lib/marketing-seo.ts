import type { Metadata } from "next";
import { routing } from "../i18n/routing";

type Locale = (typeof routing.locales)[number];

type MarketingMetadataInput = {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const DEFAULT_SITE_URL = "https://swissmail.ch";

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
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
}: MarketingMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = buildLocaleUrl(locale, pathname);
  const languages = Object.fromEntries(
    routing.locales.map((candidateLocale) => [
      candidateLocale,
      buildLocaleUrl(candidateLocale, pathname),
    ]),
  );

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...languages,
        "x-default": buildLocaleUrl(routing.defaultLocale, pathname),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Swiss Mail",
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
    name: "Swiss Mail",
    url: getSiteUrl(),
    areaServed: "CH",
    availableLanguage: [...routing.locales],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Swiss Mail",
    url: getSiteUrl(),
    inLanguage: [...routing.locales],
  };
}

export function buildServiceJsonLd({
  locale,
  title,
  description,
}: {
  locale: Locale;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description,
    url: `${getSiteUrl()}/${locale}`,
    areaServed: "CH",
    availableLanguage: locale,
    provider: {
      "@type": "Organization",
      name: "Swiss Mail",
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
