import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);
const bodyStepControllerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/useBodyStepController.ts"),
  "utf8",
);
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const recipientFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientForm.tsx"),
  "utf8",
);

describe("draft flow split structure", () => {
  it("keeps the body step split across focused modules", () => {
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyComposer.tsx"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyPreview.tsx"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyRefinementThread.tsx"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/bodyStepReducer.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/useBodyStepController.ts"))).toBe(true);
    expect(bodyStepSource).toContain('import { BodyComposer } from "./BodyComposer";');
    expect(bodyStepSource).toContain('import { BodyModeToolbar } from "./BodyModeToolbar";');
    expect(bodyStepSource).toContain('import { BodyPreview } from "./BodyPreview";');
    expect(bodyStepSource).toContain('import { useBodyStepController } from "./useBodyStepController";');
    expect(bodyStepControllerSource).toContain("bodyStepReducer,");
    expect(bodyStepControllerSource).toContain("initialBodyStepState,");
  });

  it("keeps the recipient step split across the form, search, and summary modules", () => {
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientForm.tsx"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientCompanySearchField.tsx"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientSelectedCompanySummary.tsx"))).toBe(true);
    expect(recipientStepSource).toContain('import { RecipientForm } from "./RecipientForm";');
    expect(recipientFormSource).toContain('import { RecipientCompanySearchField } from "./RecipientCompanySearchField";');
    expect(recipientFormSource).toContain('import { RecipientSelectedCompanySummary } from "./RecipientSelectedCompanySummary";');
  });
});
