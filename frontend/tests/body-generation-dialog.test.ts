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

  it("routes body-step loading through the extracted helper instead of ad-hoc inline flags", () => {
    expect(bodyStepSource).toContain('import { getBodyLoadingState } from "./body-loading-state";');
    expect(bodyStepSource).toContain("const loadingState = getBodyLoadingState({");
    expect(bodyStepSource).toContain(
      "const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;",
    );
  });

  it("loading UI uses one drafting indicator with readable dark-mode contrast and no Loader2 spinner", () => {
    expect(bodyGenerationDialogSource).not.toContain("<Loader2");
    expect(bodyGenerationDialogSource).toContain("loadingLabel");
    expect(bodyGenerationDialogSource).toContain("dark:bg-amber-400/22 dark:text-amber-100 dark:ring-amber-300/25");
    expect(bodyGenerationDialogSource).not.toContain("dark:bg-zinc-100 dark:text-zinc-950");
    expect(bodyGenerationDialogSource).toContain('role="status"');
    expect(bodyStepSource).toContain('loadingLabel={t("bodyGenerationLoadingLabel")}');
  });

  it("keeps the generation recovery state non-dismissible with refresh first and support disabled", () => {
    expect(bodyGenerationDialogSource).toContain("onEscapeKeyDown={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("onPointerDownOutside={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("<PrimaryButton onClick={onRefresh}");
    expect(bodyGenerationDialogSource).toContain("<SecondaryButton disabled");
  });
});
