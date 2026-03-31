import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);

const bodyGenerationDialogSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx"),
  "utf8",
);

describe("body generation dialog regressions", () => {
  it("uses a blocking dialog instead of the old inline drafting strip", () => {
    expect(bodyStepSource).toContain('import { BodyGenerationDialog } from "./BodyGenerationDialog";');
    expect(bodyStepSource).toContain("const shouldShowBodyGenerationDialog =");
    expect(bodyStepSource).toContain("<BodyGenerationDialog");
    expect(bodyStepSource).not.toContain("conversation.streamingText ? (");
  });

  it("keeps the generation recovery state non-dismissible with refresh first and support disabled", () => {
    expect(bodyGenerationDialogSource).toContain("onEscapeKeyDown={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("onPointerDownOutside={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("<PrimaryButton onClick={onRefresh}");
    expect(bodyGenerationDialogSource).toContain("<SecondaryButton disabled");
  });
});
