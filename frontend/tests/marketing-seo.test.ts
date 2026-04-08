import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, sep } = await import("node:path");

  const getNestedValue = (source: unknown, keyPath: string) =>
    keyPath.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[segment];
    }, source);

  const formatMessage = (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? `{${key}}`));

  const frontendRoot = process.cwd().endsWith(`${sep}frontend`)
    ? process.cwd()
    : join(process.cwd(), "frontend");

  const readLocaleMessages = (locale: string) =>
    JSON.parse(
      readFileSync(join(frontendRoot, "src", "messages", `${locale}.json`), "utf8"),
    ) as Record<string, unknown>;

  return {
    async getTranslations({
      locale = "de-CH",
      namespace,
    }: {
      locale?: string;
      namespace?: string;
    }) {
      const messages = readLocaleMessages(locale);
      const base = namespace ? getNestedValue(messages, namespace) : messages;

      return (key: string, values?: Record<string, unknown>) => {
        const value = getNestedValue(base, key);

        if (typeof value !== "string") {
          throw new Error(`Missing translation: ${namespace ? `${namespace}.` : ""}${key}`);
        }

        return formatMessage(value, values);
      };
    },
  };
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const localeMessages = {
  "de-CH": JSON.parse(readRepoFile("frontend/src/messages/de-CH.json")) as Record<string, unknown>,
  "en-CH": JSON.parse(readRepoFile("frontend/src/messages/en-CH.json")) as Record<string, unknown>,
  "fr-CH": JSON.parse(readRepoFile("frontend/src/messages/fr-CH.json")) as Record<string, unknown>,
  "it-CH": JSON.parse(readRepoFile("frontend/src/messages/it-CH.json")) as Record<string, unknown>,
} as const;

const marketingRouteModules = {
  home: () => import("../src/app/[locale]/page"),
  pricing: () => import("../src/app/[locale]/pricing/page"),
  help: () => import("../src/app/[locale]/help/page"),
  privacy: () => import("../src/app/[locale]/privacy/page"),
  terms: () => import("../src/app/[locale]/terms/page"),
  imprint: () => import("../src/app/[locale]/imprint/page"),
} as const;

globalThis.React = React;

vi.mock("../src/i18n/navigation", async () => {
  const React = await import("react");

  return {
    Link: ({ href, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : String(href ?? "#"), ...props },
        children,
      ),
  };
});

vi.mock("../src/components/marketing/Header", async () => {
  const React = await import("react");

  return {
    Header: () => React.createElement("header", null, "Header"),
  };
});

vi.mock("../src/components/marketing/Footer", async () => {
  const React = await import("react");

  return {
    Footer: () => React.createElement("footer", null, "Footer"),
  };
});

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function getNestedValue(source: unknown, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, source);
}

function getTopLevelChildren(element: React.ReactElement) {
  const children = element.props.children;
  return Array.isArray(children) ? children : [children];
}

function getJsonLdNode(element: React.ReactElement) {
  return getTopLevelChildren(element).find(
    (child): child is React.ReactElement =>
      React.isValidElement(child) &&
      typeof child.type === "function" &&
      child.type.name === "JsonLd",
  );
}

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    return;
  }

  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("marketing seo plumbing", () => {
  it("builds canonical and hreflang alternates for marketing pages", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";

    const { buildMarketingMetadata } = await import("../src/lib/marketing-seo");
    const metadata = buildMarketingMetadata({
      locale: "fr-CH",
      pathname: "/pricing",
      title: "Tarifs",
      description: "Comparez les tarifs Swiss Mail.",
    });

    expect(metadata.alternates?.canonical).toBe("https://example.test/fr-CH/pricing");
    expect(metadata.alternates?.languages).toEqual({
      "de-CH": "https://example.test/de-CH/pricing",
      "fr-CH": "https://example.test/fr-CH/pricing",
      "it-CH": "https://example.test/it-CH/pricing",
      "en-CH": "https://example.test/en-CH/pricing",
      "x-default": "https://example.test/de-CH/pricing",
    });
    expect(metadata.metadataBase).toEqual(new URL("https://example.test"));
    expect(metadata.openGraph).toMatchObject({
      title: "Tarifs",
      description: "Comparez les tarifs Swiss Mail.",
      url: "https://example.test/fr-CH/pricing",
      locale: "fr-CH",
      siteName: "Swiss Mail",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({
      title: "Tarifs",
      description: "Comparez les tarifs Swiss Mail.",
      card: "summary_large_image",
    });
  });

  it("normalizes a trailing slash in the public site url", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";

    const { buildMarketingMetadata, getSiteUrl } = await import("../src/lib/marketing-seo");
    const metadata = buildMarketingMetadata({
      locale: "de-CH",
      pathname: "/help",
      title: "Hilfe",
      description: "Antworten für Swiss Mail.",
    });

    expect(getSiteUrl()).toBe("https://example.test");
    expect(metadata.alternates?.canonical).toBe("https://example.test/de-CH/help");
    expect(metadata.alternates?.languages).not.toEqual(
      expect.objectContaining({
        "de-CH": "https://example.test//de-CH/help",
      }),
    );
  });

  it("reuses the shared noindex metadata in non-marketing layouts", () => {
    const files = [
      "frontend/src/app/[locale]/admin/layout.tsx",
      "frontend/src/app/[locale]/draft/layout.tsx",
      "frontend/src/app/[locale]/resume/layout.tsx",
      "frontend/src/app/[locale]/status/layout.tsx",
    ];

    for (const file of files) {
      const source = readRepoFile(file);

      expect(source).toContain("NO_INDEX_METADATA");
      expect(source).toContain("export const metadata = NO_INDEX_METADATA");
    }
  });

  it("returns locale-aware metadata for every current marketing page", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";

    const pages = [
      {
        loadModule: marketingRouteModules.home,
        locale: "en-CH",
        pathname: "",
        titleKey: "seo.home.title",
        descriptionKey: "seo.home.description",
      },
      {
        loadModule: marketingRouteModules.pricing,
        locale: "fr-CH",
        pathname: "/pricing",
        titleKey: "seo.pricing.title",
        descriptionKey: "seo.pricing.description",
      },
      {
        loadModule: marketingRouteModules.help,
        locale: "it-CH",
        pathname: "/help",
        titleKey: "seo.help.title",
        descriptionKey: "seo.help.description",
      },
      {
        loadModule: marketingRouteModules.privacy,
        locale: "de-CH",
        pathname: "/privacy",
        titleKey: "seo.privacy.title",
        descriptionKey: "seo.privacy.description",
      },
      {
        loadModule: marketingRouteModules.terms,
        locale: "en-CH",
        pathname: "/terms",
        titleKey: "seo.terms.title",
        descriptionKey: "seo.terms.description",
      },
      {
        loadModule: marketingRouteModules.imprint,
        locale: "fr-CH",
        pathname: "/imprint",
        titleKey: "seo.imprint.title",
        descriptionKey: "seo.imprint.description",
      },
    ] as const;

    for (const page of pages) {
      const module = await page.loadModule();
      const metadata = await module.generateMetadata({
        params: Promise.resolve({ locale: page.locale }),
      });
      const messages = localeMessages[page.locale];

      expect(metadata).toMatchObject({
        title: getNestedValue(messages, page.titleKey),
        description: getNestedValue(messages, page.descriptionKey),
      });
      expect(metadata.alternates?.canonical).toBe(
        `https://example.test/${page.locale}${page.pathname}`,
      );
    }
  });

  it("returns route-specific structured data only on supported marketing pages", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";

    const { default: HomePage } = await marketingRouteModules.home();
    const { default: PricingPage } = await marketingRouteModules.pricing();
    const { default: HelpPage } = await marketingRouteModules.help();
    const { default: PrivacyPage } = await marketingRouteModules.privacy();
    const { default: TermsPage } = await marketingRouteModules.terms();
    const { default: ImprintPage } = await marketingRouteModules.imprint();

    const homePage = await HomePage({ params: Promise.resolve({ locale: "en-CH" }) });
    const pricingPage = await PricingPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const helpPage = await HelpPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const privacyPage = await PrivacyPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const termsPage = await TermsPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const imprintPage = await ImprintPage({ params: Promise.resolve({ locale: "en-CH" }) });

    const homeJsonLd = getJsonLdNode(homePage);
    const pricingJsonLd = getJsonLdNode(pricingPage);
    const helpJsonLd = getJsonLdNode(helpPage);

    expect(homeJsonLd?.props.data).toMatchObject([
      { "@type": "Organization", url: "https://example.test" },
      { "@type": "WebSite", url: "https://example.test" },
      {
        "@type": "Service",
        name: getNestedValue(localeMessages["en-CH"], "seo.home.title"),
        description: getNestedValue(localeMessages["en-CH"], "seo.home.description"),
        url: "https://example.test/en-CH",
      },
    ]);

    expect(pricingJsonLd?.props.data).toMatchObject({
      "@type": "Service",
      name: getNestedValue(localeMessages["en-CH"], "seo.pricing.title"),
      description: getNestedValue(localeMessages["en-CH"], "seo.pricing.description"),
      url: "https://example.test/en-CH/pricing",
    });

    expect(helpJsonLd?.props.data).toMatchObject({
      "@type": "FAQPage",
      mainEntity: expect.arrayContaining([
        expect.objectContaining({
          "@type": "Question",
          name: getNestedValue(localeMessages["en-CH"], "help.faq1q"),
          acceptedAnswer: expect.objectContaining({
            "@type": "Answer",
            text: getNestedValue(localeMessages["en-CH"], "help.faq1a"),
          }),
        }),
      ]),
    });

    expect(getJsonLdNode(privacyPage)).toBeUndefined();
    expect(getJsonLdNode(termsPage)).toBeUndefined();
    expect(getJsonLdNode(imprintPage)).toBeUndefined();
  });

  it("renders the privacy page with geo.admin source disclosure", async () => {
    const { default: PrivacyPage } = await marketingRouteModules.privacy();
    const privacyPage = await PrivacyPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const markup = renderToStaticMarkup(privacyPage);

    expect(markup).toContain("Source: Federal Office of Topography");
    expect(markup).toContain("geo.admin.ch");
  });

  it("includes only marketing routes in the sitemap", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";

    const { default: sitemap } = await import("../src/app/sitemap");
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://example.test/de-CH");
    expect(urls).toContain("https://example.test/en-CH/pricing");
    expect(urls).toContain("https://example.test/it-CH/help");
    expect(urls).toContain("https://example.test/fr-CH/privacy");
    expect(urls).not.toContain("https://example.test/de-CH/draft/new");
    expect(urls).not.toContain("https://example.test/de-CH/admin");
    expect(urls).not.toContain("https://example.test/de-CH/resume/token");
    expect(urls).not.toContain("https://example.test/de-CH/status/token");
  });

  it("escapes unsafe characters before embedding json-ld", async () => {
    const { JsonLd } = await import("../src/components/marketing/JsonLd");
    const element = JsonLd({
      data: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: "Swiss <Mail>",
        description: "Line\u2028break\u2029test",
      },
    });

    expect(element.props.dangerouslySetInnerHTML.__html).toContain("\\u003c");
    expect(element.props.dangerouslySetInnerHTML.__html).not.toContain("<Mail>");
    expect(element.props.dangerouslySetInnerHTML.__html).toContain("\\u2028");
    expect(element.props.dangerouslySetInnerHTML.__html).toContain("\\u2029");
  });
});
