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
  it("stores the selected assurance level on the draft instead of in local browser state", () => {
    expect(
      existsSync(
        path.join(repoRoot, "frontend/src/hooks/use-draft-signature-assurance.ts"),
      ),
    ).toBe(false);
    expect(logisticsStepSource).not.toContain("useDraftSignatureAssuranceLevel");
    expect(logisticsStepSource).toContain("draft.data?.signatureAssuranceLevel");
    expect(logisticsStepSource).toContain("SignatureAssuranceLevelValue");
    expect(logisticsStepSource).toContain(
      "signatureAssuranceLevel: SignatureAssuranceLevel.qualified",
    );
    expect(logisticsStepSource).toContain(
      "signatureAssuranceLevel: SignatureAssuranceLevel.visual",
    );
  });

  it("includes signature assurance in the preview payload shape", () => {
    expect(previewHookSource).toContain(
      "signatureAssuranceLevel: SignatureAssuranceLevelValue;",
    );
  });
});
