import type { Metadata } from "next";
import { routing } from "../i18n/routing";
import { BRAND_NAME } from "./brand";
import { LEGAL_OPERATOR } from "./legal-config";
import { env } from "./env";
import type { ServicePriceBand } from "./server-pricing";

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

  // Setting `openGraph` here overrides the inherited file-based opengraph-image,
  // so the share card must be referenced explicitly on both OG and Twitter.
  const ogImage = {
    url: `${siteUrl}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${BRAND_NAME} — formal letters via Swiss Post`,
  };

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
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export function buildOrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  const streetAddress = LEGAL_OPERATOR.addressLines[0] ?? "";
  // "1294 Genthod" → postal code + locality.
  const [postalCode = "", ...localityParts] = (
    LEGAL_OPERATOR.addressLines[1] ?? ""
  ).split(" ");
  const addressLocality = localityParts.join(" ");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: BRAND_NAME,
    legalName: LEGAL_OPERATOR.companyName,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    image: `${siteUrl}/opengraph-image`,
    email: LEGAL_OPERATOR.supportEmail,
    vatID: LEGAL_OPERATOR.uidVat,
    areaServed: "CH",
    availableLanguage: [...routing.locales],
    address: {
      "@type": "PostalAddress",
      streetAddress,
      postalCode,
      addressLocality,
      addressCountry: "CH",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: LEGAL_OPERATOR.supportEmail,
      availableLanguage: [...routing.locales],
    },
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
  priceBand,
}: {
  locale: Locale;
  title: string;
  description: string;
  pathname?: string | undefined;
  /**
   * Postage-inclusive price band sourced from the cached rate matrix
   * (see getServicePriceBand). Omitted when unavailable so a stale/wrong price
   * is never advertised in structured data.
   */
  priceBand?: ServicePriceBand | null | undefined;
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
      "@id": `${getSiteUrl()}/#organization`,
      name: BRAND_NAME,
      url: getSiteUrl(),
    },
    ...(priceBand
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: priceBand.currency,
            lowPrice: priceBand.lowPrice,
            highPrice: priceBand.highPrice,
            offerCount: 2,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

/**
 * Article schema for informational drafting-template pages (how to write letter
 * X). These are editorial content, NOT a distinct priced product — advertising a
 * Service with an offer on them would be misleading. Author/publisher point at
 * the Organization node for E-E-A-T. The actual paid sending service uses
 * buildServiceJsonLd, reserved for the service-guide pages.
 */
export function buildArticleJsonLd({
  locale,
  headline,
  description,
  pathname = "",
}: {
  locale: Locale;
  headline: string;
  description: string;
  pathname?: string | undefined;
}) {
  const url = buildLocaleUrl(locale, pathname);
  const orgId = `${getSiteUrl()}/#organization`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    inLanguage: locale,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", "@id": orgId, name: BRAND_NAME },
    publisher: { "@type": "Organization", "@id": orgId, name: BRAND_NAME },
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
