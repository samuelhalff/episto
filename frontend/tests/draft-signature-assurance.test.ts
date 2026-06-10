import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const previewHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-letter-preview.ts"),
  "utf8",
);

describe("draft signature assurance source of truth", () => {
  it("does not keep a separate signature assurance state hook", () => {
    expect(
      existsSync(
        path.join(repoRoot, "frontend/src/hooks/use-draft-signature-assurance.ts"),
      ),
    ).toBe(false);
    expect(logisticsStepSource).not.toContain("useDraftSignatureAssuranceLevel");
    expect(logisticsStepSource).not.toContain("signatureAssuranceLevel");
    expect(logisticsStepSource).toContain('signatureFlowMode: "visual"');
  });

  it("does not include signature assurance in the preview payload shape", () => {
    expect(previewHookSource).not.toContain("signatureAssuranceLevel");
  });
});
