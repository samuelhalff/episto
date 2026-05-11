import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const recipientFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientForm.tsx"),
  "utf8",
);

describe("recipient company manual entry search", () => {
  it("keeps company suggestions active while manual address fields are visible", () => {
    expect(recipientStepSource).toContain("isCompanyValue && selectedCompany === null");
    expect(recipientStepSource).toContain(
      "isCompanyValue && selectedCompany === null && companyName.trim().length >= 2",
    );
    expect(recipientStepSource).not.toContain(
      "isCompanyValue && !showManual && companyName.trim().length >= 2",
    );
    expect(recipientStepSource).toContain(
      "isCompanyValue && showManual && selectedCompany && companyName.trim().length > 0",
    );
  });

  it("uses the searchable company input for unselected manual company recipients", () => {
    expect(recipientFormSource).toContain("isCompany && selectedCompany ?");
    expect(recipientFormSource).toContain("isCompany && selectedCompany === null ?");
    expect(recipientFormSource).not.toContain('name="recipientCompanyName"');
  });
});
