import { createElement } from "react";

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

export function JsonLd({ data }: JsonLdProps) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: escapeJsonLd(data) },
  });
}
