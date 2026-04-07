import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);
const draftWorkspaceClientSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);

describe("draft flow import hygiene", () => {
  it("does not duplicate step-props type imports after merges", () => {
    const bodyStepImports = bodyStepSource.match(/from "\.\/step-props";/g) ?? [];
    const draftWorkspaceClientImports =
      draftWorkspaceClientSource.match(/from "\.\/step-props";/g) ?? [];

    expect(bodyStepImports).toHaveLength(1);
    expect(draftWorkspaceClientImports).toHaveLength(1);
  });
});
