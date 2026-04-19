import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { mergeDraftWorkspaceState } from "@swiss-mail/shared";

import {
  getDraftWorkspaceUnlockedStepIndex,
  isDraftWorkspaceStepLocked,
} from "../src/components/product/draft-flow/steps";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);
const stepIndicatorSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StepIndicator.tsx"),
  "utf8",
);
const newDraftPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);
const newDraftEntryHelperPath = path.join(
  repoRoot,
  "frontend/src/lib/new-draft-entry.ts",
);
const newDraftEntryHelperSource = existsSync(newDraftEntryHelperPath)
  ? readFileSync(newDraftEntryHelperPath, "utf8")
  : "";

const resumePageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/resume/[token]/page.tsx"),
  "utf8",
);

const draftWorkspaceClientSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);
const useConversationSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-conversation.ts"),
  "utf8",
);
const intakeStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);
const intakeTipsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeTips.tsx"),
  "utf8",
);
const senderStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SenderStep.tsx"),
  "utf8",
);
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);
const bodyStepControllerSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/useBodyStepController.ts",
  ),
  "utf8",
);
const attachmentsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/AttachmentsStep.tsx"),
  "utf8",
);
const subjectStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SubjectStep.tsx"),
  "utf8",
);
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);

const sessionRoutesSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/sessions/session.routes.ts"),
  "utf8",
);

describe("draft workspace navigation", () => {
  it("keeps intake and sender available before later steps unlock", () => {
    expect(getDraftWorkspaceUnlockedStepIndex(null)).toBe(1);
    expect(isDraftWorkspaceStepLocked("sender", 1)).toBe(false);
    expect(isDraftWorkspaceStepLocked("recipient", 1)).toBe(true);
  });

  it("honors explicit sequential unlock progress beyond inferred draft data", () => {
    expect(
      getDraftWorkspaceUnlockedStepIndex({
        senderProfileId: "sender-id",
        recipientProfileId: "recipient-id",
        body: "Hello",
        subject: null,
        metadata: mergeDraftWorkspaceState(null, {
          furthestUnlockedStepIndex: 5,
        }),
      }),
    ).toBe(5);
  });

  it("keeps older resumed drafts reachable from saved subject data", () => {
    expect(
      getDraftWorkspaceUnlockedStepIndex({
        senderProfileId: "sender-id",
        recipientProfileId: "recipient-id",
        body: "Hello",
        subject: "Rental notice",
        metadata: {},
      }),
    ).toBe(6);
  });

  it("shows lock affordances in the step overlay", () => {
    expect(stepOverlaySource).toContain("<Lock");
  });

  it("shows step name without redundant phase label in the step indicator", () => {
    expect(stepIndicatorSource).not.toContain('t("phaseProgress"');
    expect(stepIndicatorSource).toContain("t(currentStepKey)");
  });

  it("uses clearer confirmation copy when starting a new draft from resume", () => {
    expect(newDraftPageSource).toContain('confirmLabel={tc("startNewLetter")}');
    expect(newDraftPageSource).not.toContain('confirmLabel={tr("startFresh")}');
  });

  it("routes the default new-letter flow straight into the shared intake workspace", () => {
    expect(newDraftPageSource).toContain('{ kind: "ready"; hasActiveSession: boolean }');
    expect(newDraftPageSource).toContain("const startDraft = useCallback(");
    expect(newDraftPageSource).toContain(
      'if (state.kind !== "ready" || freshEntryStartedRef.current) {',
    );
    expect(newDraftPageSource).toContain('pendingAction: "fresh"');
    expect(newDraftPageSource).toContain(
      "forceNewSession: forceFreshEntry || !state.hasActiveSession",
    );
    expect(newDraftPageSource).not.toContain("<textarea");
    expect(newDraftPageSource).not.toContain("handleEntrySubmit");
    expect(newDraftPageSource).not.toContain('useDictation({ fieldContext: "entry" })');
  });

  it("seeds shared intake prefills in draft metadata before routing into the workspace", () => {
    expect(newDraftPageSource).toContain("mergeDraftWorkspaceState");
    expect(newDraftPageSource).toContain("intakeInput: initialIntakeInput");
    expect(newDraftPageSource).toContain("queryClient.setQueryData");
    expect(newDraftPageSource).not.toContain("primePendingDraftTurn");
    expect(intakeStepSource).toContain(
      'const initialInput = workspaceState.intakeInput ?? "";',
    );
    expect(intakeStepSource).toContain("setIntakeText(initialInput)");
    expect(useConversationSource).toContain("readPendingDraftTurn");
  });

  it("keeps the seeded workspace renderable while draft and session queries refresh", () => {
    expect(draftWorkspaceClientSource).toContain("!draft.data && draft.isLoading");
    expect(draftWorkspaceClientSource).toContain("!draft.data && session.isLoading");
    expect(draftWorkspaceClientSource).not.toContain(
      "session.isLoading || draft.isLoading",
    );
  });

  it("tracks entry loading intent so resume and start-fresh actions do not share one spinner", () => {
    expect(newDraftPageSource).toContain("pendingStartAction");
    expect(newDraftPageSource).toContain('pendingStartAction === "resume"');
    expect(newDraftPageSource).toContain('pendingAction: "fresh"');
  });

  it("uses an explicit recoverable-draft helper instead of resuming the latest draft blindly", () => {
    expect(existsSync(newDraftEntryHelperPath)).toBe(true);
    expect(newDraftPageSource).toContain("findRecoverableDraft");
    expect(newDraftEntryHelperSource).toContain("submitted");
    expect(newDraftEntryHelperSource).toContain("dispatched");
    expect(newDraftEntryHelperSource).toContain("closed");
    expect(newDraftPageSource).not.toContain(
      "return sortDraftsByActivity(drafts)[0] ?? null;",
    );
  });

  it("keeps the fresh entry param on the same immediate workspace flow", () => {
    expect(newDraftPageSource).toContain("shouldForceFreshEntry(searchParams)");
    expect(newDraftPageSource).toContain(
      "forceNewSession: forceFreshEntry || !state.hasActiveSession",
    );
  });

  it("keeps the first-step tips and dictation inside the workspace intake surface", () => {
    expect(intakeStepSource).toContain("<IntakeTips />");
    expect(intakeTipsSource).toContain('t("proTips")');
    expect(intakeStepSource).toContain(
      'icon={dictation.isRecording ? "stop" : "dictate"}',
    );
    expect(intakeStepSource).toContain('t("intakeQuickActionsMore")');
    expect(newDraftPageSource).not.toContain(
      'variant={dictation.isRecording ? "warning" : "secondary"}',
    );
    expect(newDraftPageSource).not.toContain('className="app-list-item group');
  });

  it("redirects prepared drafts away from the old editable workspace routes", () => {
    expect(draftWorkspaceClientSource).toContain("PREPARED_REVIEW_STATUSES");
    expect(draftWorkspaceClientSource).toContain("ready_to_sign");
    expect(draftWorkspaceClientSource).toContain("POST_SUBMISSION_STATUSES");
    expect(draftWorkspaceClientSource).toContain(
      "router.replace(`/draft/${draftId}/review`)",
    );
    expect(draftWorkspaceClientSource).toContain(
      "router.replace(`/draft/${draftId}/confirmation`)",
    );
  });

  it("uses the backend redirect URL when resuming a draft", () => {
    expect(resumePageSource).toContain("redirectUrl");
    expect(resumePageSource).toContain("router.replace(result.redirectUrl)");
    expect(resumePageSource).not.toContain("result.draftId");
  });

  it("branches resume redirects by draft status on the backend", () => {
    expect(sessionRoutesSource).toContain("function getResumeRedirectUrl");
    expect(sessionRoutesSource).toContain('case "reviewed":');
    expect(sessionRoutesSource).toContain("return `/draft/${draftId}/review`;");
    expect(sessionRoutesSource).toContain('case "submitted":');
    expect(sessionRoutesSource).toContain("return `/draft/${draftId}/confirmation`;");
  });

  it("provides destination-based previous-step actions inside the workspace", () => {
    expect(draftWorkspaceClientSource).toContain('from "@/lib/customer-flow"');
    expect(draftWorkspaceClientSource).toContain("previousStepSlug");
    expect(draftWorkspaceClientSource).toContain("previousStepLabel");
    expect(draftShellSource).toContain("secondaryActionLabel");
    expect(draftShellSource).toContain("onSecondaryAction");
    expect(senderStepSource).toContain("secondaryActionLabel={previousStepLabel}");
    expect(recipientStepSource).toContain("secondaryActionLabel={previousStepLabel}");
    expect(bodyStepSource).toContain("secondaryActionLabel={previousStepLabel}");
    expect(attachmentsStepSource).toContain("secondaryActionLabel={previousStepLabel}");
    expect(subjectStepSource).toContain("secondaryActionLabel={previousStepLabel}");
    expect(logisticsStepSource).toContain("secondaryActionLabel={previousStepLabel}");
  });

  it("uses consistent continue-to-next-step copy across the workspace CTAs", () => {
    expect(senderStepSource).toContain('t("continueToRecipient")');
    expect(senderStepSource).not.toContain('t("nextRecipient")');
    expect(recipientStepSource).toContain('t("continueToContent")');
    expect(recipientStepSource).not.toContain('t("confirmRecipient")');
    expect(bodyStepSource).toContain('t("continueToAttachments")');
    expect(bodyStepSource).not.toContain('t("confirmContent")');
    expect(attachmentsStepSource).toContain('t("continueToSubject")');
    expect(subjectStepSource).toContain('t("continueToLogistics")');
    expect(subjectStepSource).not.toContain('t("confirmSubject")');
    expect(logisticsStepSource).toContain('t("continueToReview")');
    expect(logisticsStepSource).not.toContain('t("reviewAndPay")');
  });

  it("routes preview props only to steps that render preview controls", () => {
    expect(draftWorkspaceClientSource).toContain("const previewProps = {");
    expect(draftWorkspaceClientSource).not.toMatch(
      /const commonProps = \{[\s\S]*onTogglePreview[\s\S]*isPreviewPanelVisible/,
    );
    expect(draftWorkspaceClientSource).not.toContain("furthestUnlockedStepIndex,");
    expect(draftWorkspaceClientSource).toContain(
      '<IntakeStep key="intake" {...commonProps} {...previewProps} />',
    );
    expect(draftWorkspaceClientSource).toContain(
      '<BodyStep key="body" {...commonProps} {...previewProps} />',
    );
  });

  it("keeps preview-capable steps on a modal fallback when the side pane is unavailable", () => {
    expect(intakeStepSource).toContain(
      "const handlePreviewAction = onTogglePreview ?? (() => setShowPreview(true));",
    );
    expect(intakeStepSource).toContain("<LetterPreviewModal");
    expect(bodyStepControllerSource).toContain("if (onTogglePreview) {");
    expect(bodyStepControllerSource).toContain(
      'dispatch({ type: "set-show-preview", value: true });',
    );
    expect(bodyStepSource).toContain("onTogglePreview={handlePreviewAction}");
    expect(bodyStepSource).toContain("<LetterPreviewModal");
  });
});
