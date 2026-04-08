import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const globalsSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);

describe("signature MVP flow", () => {
  it("removes the signature image upload controls from the logistics step", () => {
    expect(logisticsStepSource).not.toContain("signatureImage");
    expect(logisticsStepSource).not.toContain("handleUploadSignature");
    expect(logisticsStepSource).not.toContain("sigInputRef");
    expect(logisticsStepSource).not.toContain("files.signature");
  });

  it("ships a local handwritten font for generated signatures", () => {
    expect(globalsSource).toContain("@font-face");
    expect(globalsSource).toContain('font-family: "Allura Signature"');
    expect(globalsSource).toContain(".signature-script");
  });
});
