import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
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

  it("wires route-level metadata for every current marketing page", () => {
    const pages = [
      {
        file: "frontend/src/app/[locale]/page.tsx",
        pathname: 'pathname: ""',
        namespace: 'namespace: "seo"',
      },
      {
        file: "frontend/src/app/[locale]/pricing/page.tsx",
        pathname: 'pathname: "/pricing"',
        namespace: 'namespace: "seo"',
      },
      {
        file: "frontend/src/app/[locale]/help/page.tsx",
        pathname: 'pathname: "/help"',
        namespace: 'namespace: "seo"',
      },
      {
        file: "frontend/src/app/[locale]/privacy/page.tsx",
        pathname: 'pathname: "/privacy"',
        namespace: 'namespace: "seo"',
      },
      {
        file: "frontend/src/app/[locale]/terms/page.tsx",
        pathname: 'pathname: "/terms"',
        namespace: 'namespace: "seo"',
      },
      {
        file: "frontend/src/app/[locale]/imprint/page.tsx",
        pathname: 'pathname: "/imprint"',
        namespace: 'namespace: "seo"',
      },
    ];

    for (const page of pages) {
      const source = readRepoFile(page.file);

      expect(source).toContain("export async function generateMetadata");
      expect(source).toContain("buildMarketingMetadata");
      expect(source).toContain(page.pathname);
      expect(source).toContain(page.namespace);
    }
  });

  it("renders structured-data hooks on supported marketing pages", () => {
    const homePage = readRepoFile("frontend/src/app/[locale]/page.tsx");
    const pricingPage = readRepoFile("frontend/src/app/[locale]/pricing/page.tsx");
    const helpPage = readRepoFile("frontend/src/app/[locale]/help/page.tsx");

    expect(homePage).toContain("JsonLd");
    expect(homePage).toContain("buildOrganizationJsonLd");
    expect(homePage).toContain("buildWebsiteJsonLd");
    expect(homePage).toContain("buildServiceJsonLd");

    expect(pricingPage).toContain("JsonLd");
    expect(pricingPage).toContain("buildServiceJsonLd");

    expect(helpPage).toContain("JsonLd");
    expect(helpPage).toContain("buildFaqJsonLd");
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
