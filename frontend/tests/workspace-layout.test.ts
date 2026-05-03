import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);

const letterPreviewModalSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreviewModal.tsx"),
  "utf8",
);

const workspacePreviewPaneSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx",
  ),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const draftWorkspaceClientSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);

const intakeStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);

const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);

describe("workspace layout regressions", () => {
  it("keeps preview sheets immersive instead of double-capping the reading width", () => {
    expect(letterPreviewSource).toContain('variant?: "default" | "immersive"');
    expect(letterPreviewSource).toContain('variant = "default"');
    expect(letterPreviewSource).toContain("max-w-[980px]");
    expect(letterPreviewSource).toContain("letter-layout-shell");
    expect(letterPreviewSource).toContain("sender-block");
    expect(letterPreviewSource).toContain("dispatch-line");
    expect(letterPreviewSource).toContain("recipient-block");
    expect(letterPreviewSource).toContain("right-meta");
    expect(letterPreviewSource).toContain("items-start justify-center overflow-auto");
    expect(letterPreviewSource).toContain('containerType: "inline-size"');
    expect(letterPreviewSource).toContain('variant="letter"');
    expect(letterPreviewSource).not.toContain(
      'className="mt-6 ml-auto max-w-[260px] text-right"',
    );
  });

  it("stacks preview actions in the footer with hide below confirm", () => {
    expect(letterPreviewModalSource).toContain(
      "h-[100dvh] max-h-[100dvh] min-h-[100dvh]",
    );
    expect(letterPreviewModalSource).toContain("rounded-none");
    expect(letterPreviewModalSource).toContain("md:right-auto md:left-1/2");
    expect(letterPreviewModalSource).toContain("flex-col gap-3");
    expect(letterPreviewModalSource).toContain("SheetClose asChild");
    expect(letterPreviewModalSource).toContain("getAppButtonClassName");
    expect(letterPreviewModalSource).toContain('{t("closePreview")}');
    expect(letterPreviewModalSource).toContain('{t("confirmContent")}');
    expect(letterPreviewModalSource).toContain('{t("hidePreview")}');
    expect(letterPreviewModalSource).not.toContain("editBodyManuallyBadge");
    expect(letterPreviewModalSource).toContain('variant="immersive"');
  });

  it("keeps the pre-draft preview visible instead of replacing it with a retry state", () => {
    expect(workspacePreviewPaneSource).toContain(
      "const shouldShowBlockingError = Boolean(error) && !draft.data;",
    );
    expect(workspacePreviewPaneSource).toContain(
      "const shouldShowInlinePreviewWarning = Boolean(error) && Boolean(draft.data);",
    );
    expect(workspacePreviewPaneSource).toContain('{t("previewUnavailableRetry")}');
    expect(workspacePreviewPaneSource).not.toContain(
      "error || (!previewData && !draft.data)",
    );
  });

  it("keeps the draft shell overflow-safe on narrow screens", () => {
    expect(draftShellSource).toContain("ScrollShadowViewport");
    expect(draftShellSource).toContain("min-w-0");
    expect(draftShellSource).not.toContain("shouldHideDock");
    expect(draftShellSource).not.toContain("onTogglePreview?:");
    expect(draftShellSource).not.toContain("isPreviewPanelVisible?:");
  });

  it("keeps the desktop preview visible by default instead of resetting closed on each step", () => {
    expect(draftWorkspaceClientSource).toContain(
      "readPreviewPanelPreference(draftId) ?? true",
    );
    expect(draftWorkspaceClientSource).not.toContain(
      "setIsPreviewPanelOpen(false);\n  }, [resolvedStepSlug]);",
    );
  });

  it("uses an adaptive desktop preview width instead of a narrow fixed 520px rail", () => {
    expect(workspacePreviewPaneSource).toContain("w-[clamp(32rem,38vw,54rem)]");
    expect(workspacePreviewPaneSource).not.toContain("w-[520px]");
  });

  it("narrows the desktop drafting content cap while the preview pane is visible", () => {
    expect(draftShellSource).toContain("previewPanel?.isVisible");
    expect(draftShellSource).toContain("max-w-[1180px]");
    expect(draftShellSource).toContain("max-w-[1400px]");
  });

  it("lets the desktop preview sheet use nearly the full viewport height", () => {
    expect(letterPreviewModalSource).toContain("md:h-[calc(100dvh-2rem)]");
    expect(letterPreviewModalSource).toContain("md:max-h-[calc(100dvh-2rem)]");
    expect(letterPreviewModalSource).not.toContain("md:h-[min(94dvh,1040px)]");
  });

  it("anchors the early intake thread toward the composer instead of leaving a dead zone", () => {
    expect(intakeStepSource).toContain(
      "flex flex-1 h-full min-h-full flex-col justify-end gap-8 pb-2",
    );
    expect(intakeStepSource).toContain('className="mt-auto space-y-3 px-2"');
    expect(draftShellSource).toContain('? "flex min-h-full flex-1 flex-col pb-10 pt-5"');
    expect(draftShellSource).toContain("desktopContentMaxWidthClassName");
    expect(draftShellSource).not.toContain(
      '? "flex min-h-full flex-1 flex-col pb-32 pt-5"',
    );
    expect(draftShellSource).not.toContain(
      ': "mx-auto w-full max-w-[1400px] flex min-h-full flex-1 flex-col px-4 pb-36 pt-2 lg:px-6"',
    );
  });

  it("keeps the sticky draft dock in flow instead of adding duplicate bottom scroll padding", () => {
    expect(draftShellSource).toContain('className="relative sticky bottom-0 z-20');
    expect(draftShellSource).not.toContain("content.style.paddingBottom");
    expect(draftShellSource).not.toContain("new ResizeObserver(sync)");
  });

  it("keeps the mobile workspace host shrinkable instead of forcing a 480px overflow width", () => {
    expect(draftWorkspaceClientSource).toContain(
      'className={isCompactViewport ? "min-w-0 flex-1" : "min-w-[480px] flex-1"}',
    );
  });

  it("keeps step lists shrinkable instead of forcing horizontal overflow", () => {
    expect(stepOverlaySource).toContain("flex min-w-0 w-full items-center");
    expect(stepOverlaySource).toContain("truncate text-xs");
  });
});
