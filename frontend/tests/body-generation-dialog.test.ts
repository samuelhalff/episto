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
const bodyStepControllerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/useBodyStepController.ts"),
  "utf8",
);

const bodyGenerationDialogSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx"),
  "utf8",
);

describe("body generation dialog regressions", () => {
  it("uses a blocking dialog instead of the old inline drafting strip", () => {
    expect(bodyStepSource).toContain('import { BodyGenerationDialog } from "./BodyGenerationDialog";');
    expect(bodyStepSource).toContain('import { BodyComposer } from "./BodyComposer";');
    expect(bodyStepSource).toContain('import { BodyPreview } from "./BodyPreview";');
    expect(bodyStepSource).toContain('import { useBodyStepController } from "./useBodyStepController";');
    expect(bodyStepSource).toContain("<BodyGenerationDialog");
    expect(bodyStepSource).not.toContain("conversation.streamingText ? (");
  });

  it("routes body-step loading through the extracted helper instead of ad-hoc inline flags", () => {
    expect(bodyStepControllerSource).toContain('import { getBodyLoadingState } from "./body-loading-state";');
    expect(bodyStepControllerSource).toContain("bodyStepReducer,");
    expect(bodyStepControllerSource).toContain("initialBodyStepState,");
    expect(bodyStepControllerSource).toContain("useReducer(bodyStepReducer, initialBodyStepState)");
    expect(bodyStepControllerSource).toContain("const loadingState = getBodyLoadingState({");
    expect(bodyStepControllerSource).toContain(
      "const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;",
    );
  });

  it("loading UI uses one drafting indicator with stronger dual-theme contrast and no Loader2 spinner", () => {
    expect(bodyGenerationDialogSource).not.toContain("<Loader2");
    expect(bodyGenerationDialogSource).toContain("loadingLabel");
    expect(bodyGenerationDialogSource).toContain(
      "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-300/20 dark:text-amber-50 dark:ring-amber-200/30",
    );
    expect(bodyGenerationDialogSource).toContain("dark:bg-amber-200/90");
    expect(bodyGenerationDialogSource).not.toContain("dark:bg-zinc-100 dark:text-zinc-950");
    expect(bodyGenerationDialogSource).toContain('role="status"');
    expect(bodyStepSource).toContain('loadingLabel={t("bodyGenerationLoadingLabel")}');
  });

  it("keeps loading blocking but exposes an error-state close action", () => {
    expect(bodyGenerationDialogSource).toContain("onOpenChange={(nextOpen) => {");
    expect(bodyGenerationDialogSource).toContain("if (!nextOpen && !isLoading)");
    expect(bodyGenerationDialogSource).toContain("onEscapeKeyDown={handleEscapeKeyDown}");
    expect(bodyGenerationDialogSource).toContain("onPointerDownOutside={handlePointerDownOutside}");
    expect(bodyGenerationDialogSource).toContain("<PrimaryButton onClick={onRefresh}");
    expect(bodyGenerationDialogSource).toContain("closeLabel");
    expect(bodyGenerationDialogSource).toContain("onClose");
    expect(bodyGenerationDialogSource).toContain("<SecondaryButton onClick={onClose} leadingVisual=\"hide\">");
    expect(bodyGenerationDialogSource).toContain("<SecondaryButton disabled");
    expect(bodyStepControllerSource).toContain(
      "const handleDismissBodyGenerationDialog = useCallback(",
    );
    expect(bodyStepSource).toContain('closeLabel={tc("close")}');
    expect(bodyStepSource).toContain("onClose={handleDismissBodyGenerationDialog}");
  });
});
