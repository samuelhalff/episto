import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import enCH from "../src/messages/en-CH.json";
import { buildHelpFaqs } from "../src/components/marketing/faq-content";

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

  const frontendRoot = process.cwd().endsWith(`${sep}frontend`)
    ? process.cwd()
    : join(process.cwd(), "frontend");

  const messages = JSON.parse(
    readFileSync(join(frontendRoot, "src", "messages", "en-CH.json"), "utf8"),
  ) as Record<string, unknown>;

  return {
    async getTranslations({
      namespace,
    }: {
      locale?: string;
      namespace?: string;
    } = {}) {
      const base = namespace ? getNestedValue(messages, namespace) : messages;

      return (key: string) => {
        const value = getNestedValue(base, key);

        if (typeof value !== "string") {
          throw new Error(
            `Missing translation: ${namespace ? `${namespace}.` : ""}${key}`,
          );
        }

        return value;
      };
    },
  };
});

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

vi.mock("../src/components/marketing/MarketingLayout", async () => {
  const React = await import("react");

  return {
    MarketingLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement("main", null, children),
  };
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const helpPageSource = readRepoFile("frontend/src/app/[locale]/help/page.tsx");
const helpPageCtaPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/HelpPageCta.tsx",
);
const helpPageCtaSource = existsSync(helpPageCtaPath)
  ? readFileSync(helpPageCtaPath, "utf8")
  : "";

globalThis.React = React;

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function getNestedValue(source: unknown, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, source);
}

function createTranslator(messages: Record<string, unknown>) {
  return (key: string) => {
    const value = getNestedValue(messages, key);

    if (typeof value !== "string") {
      throw new Error(`Missing translation for ${key}`);
    }

    return value;
  };
}

function parseJsonLd(markup: string) {
  const match = markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  if (!match) {
    throw new Error("Missing FAQ JSON-LD");
  }

  return JSON.parse(match[1]) as { mainEntity?: unknown[] };
}

describe("help page FAQ and CTA contract", () => {
  it("renders the full shared FAQ set and wires the wide CTA source", async () => {
    const helpMessages = enCH.help as Record<string, unknown>;
    const marketingMessages = enCH.marketing as Record<string, unknown>;
    const faqs = buildHelpFaqs(createTranslator(helpMessages));
    const { default: HelpPage } = await import("../src/app/[locale]/help/page");
    const page = await HelpPage({ params: Promise.resolve({ locale: "en-CH" }) });
    const markup = renderToStaticMarkup(page);
    const faqJsonLd = parseJsonLd(markup);

    for (const faq of faqs) {
      expect(markup).toContain(faq.question);
      expect(markup).toContain(faq.answer);
    }

    expect(helpPageSource).toContain("buildHelpFaqs");
    expect(helpPageSource).toContain("<HelpPageCta");
    expect(helpPageSource).not.toContain('className="mx-auto max-w-2xl text-center"');

    expect(existsSync(helpPageCtaPath)).toBe(true);
    expect(helpPageCtaSource).toContain("cta-sheen");
    expect(helpPageCtaSource).toContain("w-full");
    expect(helpPageCtaSource).toContain("lg:grid-cols-[minmax(0,1fr)_auto]");

    expect(markup).toContain(String(helpMessages.ctaTitle));
    expect(markup).toContain(String(marketingMessages.ctaButton));
    expect(markup).toContain('href="/draft/new"');
    expect(faqJsonLd.mainEntity).toHaveLength(faqs.length);
  });
});
