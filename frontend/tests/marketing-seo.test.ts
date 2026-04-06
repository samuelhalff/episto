import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

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
      const source = readFileSync(path.join(repoRoot, file), "utf8");

      expect(source).toContain("NO_INDEX_METADATA");
      expect(source).toContain("export const metadata = NO_INDEX_METADATA");
    }
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
