import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const pickerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/SignatureAssuranceTierPicker.tsx"),
  "utf8",
);

const localeMessagePaths = {
  "de-CH": path.join(repoRoot, "frontend/src/messages/de-CH.json"),
  "en-CH": path.join(repoRoot, "frontend/src/messages/en-CH.json"),
  "fr-CH": path.join(repoRoot, "frontend/src/messages/fr-CH.json"),
  "it-CH": path.join(repoRoot, "frontend/src/messages/it-CH.json"),
} as const;

type LocaleKey = keyof typeof localeMessagePaths;
type MessageTree = Record<string, unknown>;

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as MessageTree;
}

function getNestedValue(source: unknown, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as MessageTree)[segment];
  }, source);
}

describe("QES waitlist CTA contract", () => {
  it("keeps the coming-soon badge in normal flow instead of absolutely overlapping the icon rail", () => {
    expect(pickerSource).toContain("flex flex-wrap items-center gap-2");
    expect(pickerSource).not.toContain("absolute right-3 top-3");
  });

  it("treats the unavailable QES tier as an explicit subscribe CTA", () => {
    expect(pickerSource).toContain("data-qes-waitlist-card");
    expect(pickerSource).toContain('t("qualified.notifyLabel")');
    expect(pickerSource).toContain('t("qualified.notifyHint")');
    expect(pickerSource).toContain("setWaitlistOpen(true)");
  });

  it("ships the QES subscribe CTA copy in every supported locale", () => {
    for (const locale of Object.keys(localeMessagePaths) as LocaleKey[]) {
      const messages = readJsonFile(localeMessagePaths[locale]);
      expect(
        getNestedValue(messages, "signatureTiers.qualified.notifyLabel"),
        `${locale} is missing signatureTiers.qualified.notifyLabel`,
      ).toBeTypeOf("string");
      expect(
        getNestedValue(messages, "signatureTiers.qualified.notifyHint"),
        `${locale} is missing signatureTiers.qualified.notifyHint`,
      ).toBeTypeOf("string");
    }
  });
});
