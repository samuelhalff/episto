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
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
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
  const languages = Object.fromEntries(
    routing.locales.map((candidateLocale) => [
      candidateLocale,
      buildLocaleUrl(candidateLocale, pathname),
    ]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: buildLocaleUrl(locale, pathname),
      languages: {
        ...languages,
        "x-default": buildLocaleUrl(routing.defaultLocale, pathname),
      },
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
