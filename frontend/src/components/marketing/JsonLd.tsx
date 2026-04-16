import { createElement } from "react";
import { headers } from "next/headers";

type JsonLdPrimitive = string | number | boolean | null;
type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];

type JsonLdObject = {
  [key: string]: JsonLdValue;
};

type JsonLdProps = {
  data: JsonLdObject | JsonLdObject[];
};

function escapeJsonLd(value: JsonLdProps["data"]) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Renders a JSON-LD `<script type="application/ld+json">` tag.
 *
 * Browsers do not execute JSON-LD as JavaScript, but Firefox still enforces
 * `script-src` on every `<script>` element regardless of `type`. We therefore
 * apply the per-request nonce — sourced from proxy via `x-nonce` — so
 * the tag passes CSP in all browsers. `JsonLd` is an async Server Component
 * because `headers()` is async in Next.js 15+.
 */
export async function JsonLd({ data }: JsonLdProps) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return createElement("script", {
    type: "application/ld+json",
    nonce,
    dangerouslySetInnerHTML: { __html: escapeJsonLd(data) },
  });
}
