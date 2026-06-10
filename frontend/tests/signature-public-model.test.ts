import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const pickerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/SignatureChoicePicker.tsx"),
  "utf8",
);
const reviewReadySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/review/ReviewPageReady.tsx"),
  "utf8",
);
const workspacePreviewSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx",
  ),
  "utf8",
);
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const draftServiceSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/drafting/draft.service.ts"),
  "utf8",
);

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("public signature model", () => {
  it("keeps the picker to drawn and typed choices only", () => {
    expect(pickerSource).toContain("typed");
    expect(pickerSource).toContain("drawn");
    expect(pickerSource).not.toContain("SignatureAssuranceLevel.advanced");
  });

  it("makes drawn signature the default public choice for new and existing drafts", () => {
    expect(logisticsStepSource).toContain(
      'const currentSignatureMode = (draft.data?.signatureMode ?? "drawn") as SignatureMode;',
    );
    expect(draftServiceSource).toContain('signatureMode: "drawn"');
  });

  it("derives preview and review labels from the public choice", () => {
    expect(reviewReadySource).toContain("getPublicSignatureChoice");
    expect(workspacePreviewSource).toContain("getPublicSignatureChoice");
    expect(reviewReadySource).not.toContain("SignatureAssuranceLevelValue");
    expect(workspacePreviewSource).not.toContain("SignatureAssuranceLevelValue");
  });

  for (const locale of locales) {
    it(`${locale.name} exposes drawn and typed copy only`, () => {
      const signatureTiers = locale.data.signatureTiers as Record<string, unknown>;

      expect(signatureTiers.typed).toBeDefined();
      expect(signatureTiers.drawn).toBeDefined();
      expect(signatureTiers.visual).toBeUndefined();
      expect(signatureTiers.advanced).toBeUndefined();
    });
  }
});
