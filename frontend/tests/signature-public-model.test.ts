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
  path.join(repoRoot, "frontend/src/components/product/SignatureAssuranceTierPicker.tsx"),
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
const signatureRequirementsPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/signature-requirements/page.tsx"),
  "utf8",
);

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("public signature model", () => {
  it("keeps the picker to typed, drawn, and qualified choices only", () => {
    expect(pickerSource).toContain("typed");
    expect(pickerSource).toContain("drawn");
    expect(pickerSource).toContain("qualified");
    expect(pickerSource).not.toContain("SignatureAssuranceLevel.advanced");
  });

  it("supports a lower-emphasis secondary price detail for the public card copy", () => {
    expect(pickerSource).toContain("priceDetail");
    expect(enCH.signatureTiers.qualified.price).toContain("+CHF 9");
    expect(enCH.signatureTiers.qualified.price).not.toContain("+CHF 19");
    expect(enCH.signatureTiers.qualified.priceDetail).toContain("+CHF 19");
  });

  it("derives preview and review labels from the public choice, not the raw assurance enum", () => {
    expect(reviewReadySource).toContain("getPublicSignatureChoice");
    expect(workspacePreviewSource).toContain("getPublicSignatureChoice");
    expect(reviewReadySource).not.toContain(
      "`${displaySignatureAssuranceLevel as SignatureAssuranceLevelValue}.label`",
    );
    expect(workspacePreviewSource).not.toContain(
      "`${signatureAssuranceLevel as SignatureAssuranceLevelValue}.label`",
    );
  });

  it("removes the advanced tier from the signature requirements page", () => {
    expect(signatureRequirementsPageSource).not.toContain('key="advanced"');
    expect(signatureRequirementsPageSource).toContain('key="typed"');
    expect(signatureRequirementsPageSource).toContain('key="drawn"');
    expect(signatureRequirementsPageSource).toContain('key="qualified"');
  });

  for (const locale of locales) {
    it(`${locale.name} exposes typed, drawn, and qualified copy only`, () => {
      const signatureTiers = locale.data.signatureTiers as Record<string, unknown>;
      const requirementTiers = locale.data.signatureRequirements.sections.tiers as Record<
        string,
        unknown
      >;

      expect(signatureTiers.typed).toBeDefined();
      expect(signatureTiers.drawn).toBeDefined();
      expect(signatureTiers.qualified).toBeDefined();
      expect(
        (signatureTiers.qualified as Record<string, unknown>).priceDetail,
      ).toBeDefined();
      expect(signatureTiers.visual).toBeUndefined();
      expect(signatureTiers.advanced).toBeUndefined();

      expect(requirementTiers.typedName).toBeDefined();
      expect(requirementTiers.drawnName).toBeDefined();
      expect(requirementTiers.qualifiedName).toBeDefined();
      expect(requirementTiers.visualName).toBeUndefined();
      expect(requirementTiers.advancedName).toBeUndefined();
      expect(requirementTiers.intro).toBeDefined();
    });
  }
});
