"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Eye, MessageSquareText, Pencil, Sparkles } from "lucide-react";
import { getLetterFraming } from "@swiss-mail/shared";
import { stripLetterFramingText } from "@swiss-mail/shared/letter-framing";
import {
  useComposeDraftFromContext,
  useConversation,
  useDraft,
  useDraftFiles,
  useUpdateDraft,
} from "../../../hooks/use-api";
import { useDictation } from "../../../hooks/use-dictation";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave";
import { LetterPreviewModal } from "../LetterPreviewModal";
import { BodyGenerationDialog } from "./BodyGenerationDialog";
import { getBodyShortcutDefinitions } from "./body-shortcuts";
import {
  mergeShortcutIntoComposerValue,
  shouldSendShortcutImmediately,
} from "./prompt-shortcut-behavior";
import { PromptShortcutBar } from "./PromptShortcutBar";
import {
  Card,
  ComposerIconButton,
  DraftComposer,
  DraftShell,
  PrimaryButton,
  SegmentedControl,
  SurfaceIconButton,
} from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state";
import { LoadingDots } from "../../ui/loading-dots";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepProps {
  draftId: string;
  onNext: () => void;
  onPrevious?: (() => void) | undefined;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
  isNavigating?: boolean;
  previousStepLabel?: string | undefined;
  furthestUnlockedStepIndex?: number;
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
}

type EditMode = "ai" | "manual";

const BODY_STEP_COACHMARK_STORAGE_KEY = "swiss-mail.body-step-coachmark-dismissed.v1";

function getFirstDraftMessageId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const candidate = metadata as Record<string, unknown>;
  return typeof candidate.firstDraftMessageId === "string"
    ? candidate.firstDraftMessageId
    : null;
}

// ---------------------------------------------------------------------------
// BodyStep
// ---------------------------------------------------------------------------

export function BodyStep({
  draftId,
  onNext,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  previousStepLabel,
  furthestUnlockedStepIndex,
  onTogglePreview,
  isPreviewPanelVisible,
}: StepProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const locale = useLocale();
  const draft = useDraft(draftId);
  const files = useDraftFiles(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const composeFromContext = useComposeDraftFromContext(draftId);
  const conversation = useConversation(draftId);
  const dictation = useDictation();

  const [showPreview, setShowPreview] = useState(false);
  const [showRefinementThread, setShowRefinementThread] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("ai");
  const [bodyText, setBodyText] = useState("");
  const [userEdited, setUserEdited] = useState(false);
  const [showBodyCoachmark, setShowBodyCoachmark] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isManualFieldFocused, setIsManualFieldFocused] = useState(false);
  const [isAutoComposing, setIsAutoComposing] = useState(false);
  const [initialComposeStatus, setInitialComposeStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const hasHydratedRef = useRef(false);
  const lastSavedBodyRef = useRef("");
  const hasRequestedInitialComposeRef = useRef(false);
  const completionCountAtComposeRef = useRef(0);
  const refineAutosave = useQueuedAutosave({
    value: refineText,
    enabled: hasHydratedRef.current,
    component: "BodyStep",
    save: async (nextValue) => {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          bodyRefineInput: nextValue || null,
        }),
      });
    },
  });

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const workspaceState = getDraftWorkspaceState(draft.data?.metadata);
    const initialBody = stripLetterFramingText(
      draft.data?.body ?? "",
      draft.data?.locale ?? locale,
    );
    setBodyText(initialBody);
    setRefineText(workspaceState.bodyRefineInput ?? "");
    lastSavedBodyRef.current = initialBody;
    refineAutosave.markPersisted(workspaceState.bodyRefineInput ?? "");
    hasHydratedRef.current = true;
  }, [
    draft.data?.body,
    draft.data?.locale,
    draft.data?.metadata,
    locale,
    refineAutosave,
  ]);

  useEffect(() => {
    const syncedBody = stripLetterFramingText(
      draft.data?.body ?? "",
      draft.data?.locale ?? locale,
    );
    if (!userEdited) {
      setBodyText(syncedBody);
      lastSavedBodyRef.current = syncedBody;
    }
  }, [draft.data?.body, draft.data?.locale, locale, userEdited]);

  useEffect(() => {
    const spokenText = dictation.finalText.trim();
    if (!spokenText) return;

    setRefineText(
      (current) => `${current.trim()}${current.trim() ? " " : ""}${spokenText}`,
    );
    dictation.resetText();
  }, [dictation.finalText, dictation.resetText]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(BODY_STEP_COACHMARK_STORAGE_KEY) === "dismissed") {
        return;
      }
    } catch {
      // Ignore storage access failures and still show the coachmark once in-memory.
    }

    setShowBodyCoachmark(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!userEdited) return;
    if (bodyText === lastSavedBodyRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void updateDraft.mutateAsync({ body: bodyText }).then(() => {
        lastSavedBodyRef.current = bodyText;
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [bodyText, updateDraft, userEdited]);

  const requestInitialCompose = useCallback(async () => {
    if (composeFromContext.isPending) return;
    await composeFromContext.mutateAsync();
  }, [composeFromContext.isPending, composeFromContext.mutateAsync]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (editMode !== "ai") return;
    if (hasRequestedInitialComposeRef.current) return;
    if (draft.data?.body?.trim() || bodyText.trim()) return;
    if (composeFromContext.isPending) return;
    if (
      conversation.isSending ||
      conversation.isStreaming ||
      conversation.isAwaitingResponse
    )
      return;

    const hasConversationContext = conversation.messages.some(
      (message) => message.role === "user" && message.content.trim().length > 0,
    );
    if (!hasConversationContext) return;

    hasRequestedInitialComposeRef.current = true;
    completionCountAtComposeRef.current = conversation.completionCount;
    setIsAutoComposing(true);
    setInitialComposeStatus("loading");

    void requestInitialCompose().catch(() => {
      setIsAutoComposing(false);
      setInitialComposeStatus("error");
    });
  }, [
    bodyText,
    composeFromContext.isPending,
    conversation.completionCount,
    conversation.isAwaitingResponse,
    conversation.isSending,
    conversation.isStreaming,
    conversation.messages,
    draft.data?.body,
    editMode,
    requestInitialCompose,
  ]);

  useEffect(() => {
    if (draft.data?.body?.trim()) {
      setInitialComposeStatus("idle");
      return;
    }

    if (!isAutoComposing) return;

    if (conversation.completionCount > completionCountAtComposeRef.current) {
      if (draft.isFetching || composeFromContext.isPending) {
        return;
      }
      setIsAutoComposing(false);
      setInitialComposeStatus("error");
      return;
    }

    if (composeFromContext.isError || conversation.error) {
      setIsAutoComposing(false);
      setInitialComposeStatus("error");
    }
  }, [
    composeFromContext.isPending,
    composeFromContext.isError,
    conversation.completionCount,
    conversation.error,
    draft.data?.body,
    draft.isFetching,
    isAutoComposing,
  ]);

  useEffect(() => {
    if (!isAutoComposing) return;

    const timeoutId = window.setTimeout(() => {
      setIsAutoComposing(false);
      setInitialComposeStatus("error");
    }, 45_000);

    return () => window.clearTimeout(timeoutId);
  }, [isAutoComposing]);

  const canProceed = bodyText.trim().length > 0;
  const { salutation, closing } = useMemo(
    () => getLetterFraming(draft.data?.locale ?? locale),
    [draft.data?.locale, locale],
  );

  // Once the first real body draft exists, only later messages count as refinements.
  const refinementMessages = useMemo(() => {
    const msgs = conversation.messages;
    const firstDraftMessageId = getFirstDraftMessageId(draft.data?.metadata);
    if (!firstDraftMessageId) {
      return [];
    }

    const firstDraftMessageIndex = msgs.findIndex(
      (message) => message.id === firstDraftMessageId,
    );
    return firstDraftMessageIndex >= 0 ? msgs.slice(firstDraftMessageIndex + 1) : [];
  }, [conversation.messages, draft.data?.metadata]);
  const hasRefinements = refinementMessages.length > 0;
  const bodyPreviewText = stripLetterFramingText(
    bodyText.trim(),
    draft.data?.locale ?? locale,
  );
  const { primary: primaryQuickRefineActions, overflow: overflowQuickRefineActions } =
    useMemo(() => {
      const definitions = getBodyShortcutDefinitions({
        hasAttachments: files.attachments.length > 0,
        hasDraftBody: canProceed,
      });

      return {
        primary: definitions.primary.map((shortcut) => ({
          id: shortcut.id,
          label: t(shortcut.labelKey),
          prompt: t(shortcut.promptKey),
        })),
        overflow: definitions.overflow.map((shortcut) => ({
          id: shortcut.id,
          label: t(shortcut.labelKey),
          prompt: t(shortcut.promptKey),
        })),
      };
    }, [canProceed, files.attachments.length, t]);

  async function sendRefinementInstruction(instruction: string) {
    if (
      !instruction.trim() ||
      conversation.isSending ||
      conversation.isStreaming ||
      conversation.isAwaitingResponse
    ) {
      return;
    }

    await conversation.sendMessage(instruction);
    setRefineText("");
    refineAutosave.persistInBackground("");
    setUserEdited(false);
  }

  async function handleRefine() {
    await sendRefinementInstruction(refineText);
  }

  async function handleRefinementShortcut(prompt: string) {
    if (!shouldSendShortcutImmediately(refineText)) {
      setRefineText((current) => mergeShortcutIntoComposerValue(current, prompt));
      return;
    }

    await sendRefinementInstruction(prompt);
  }

  async function handleConfirm() {
    if (!canProceed || updateDraft.isPending) return;
    try {
      await updateDraft.mutateAsync({
        body: bodyText.trim(),
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          furthestUnlockedStepIndex: 4,
        }),
      });
      lastSavedBodyRef.current = bodyText.trim();
      onNext();
    } catch {
      showStepErrorToast({
        id: "body-step-save-error",
        title: t("stepSaveFailed"),
      });
    }
  }

  function handleBlockedConfirm() {
    showStepWarningToast({
      id: "body-step-missing",
      title: t("stepNeedsAttentionTitle"),
      items: [t("reviewMissingBody")],
    });
  }

  function handleModeChange(mode: EditMode) {
    if (mode === "manual") {
      setIsComposerFocused(false);
      onInputFocusChange?.(false);
    } else {
      setIsManualFieldFocused(false);
      onInputFocusChange?.(false);
      // Save any pending manual edits when switching back to AI
      if (bodyText.trim() && bodyText !== draft.data?.body) {
        void updateDraft.mutateAsync({ body: bodyText.trim() }).then(() => {
          lastSavedBodyRef.current = bodyText.trim();
        });
      }
    }
    setEditMode(mode);
  }

  function dismissBodyCoachmark() {
    setShowBodyCoachmark(false);

    try {
      window.localStorage.setItem(BODY_STEP_COACHMARK_STORAGE_KEY, "dismissed");
    } catch {
      // Ignore storage access failures; dismiss for the current render session.
    }
  }
  const helperText = dictation.error
    ? t("dictationError")
    : dictation.isRecording
      ? dictation.interimText || t("voicePrimaryHint")
      : undefined;

  const isAiMode = editMode === "ai";
  const isManualMode = editMode === "manual";
  const isAiBusy =
    isAutoComposing ||
    conversation.isSending ||
    conversation.isStreaming ||
    conversation.isAwaitingResponse;
  const shouldShowBodyGenerationDialog =
    !canProceed &&
    (initialComposeStatus === "loading" || initialComposeStatus === "error");
  // ── Dock: [Step trigger] [👁 Preview] [Primary CTA] ──────────────────────
  const previewButton = canProceed && !isPreviewPanelVisible ? (
    <SurfaceIconButton
      type="button"
      onClick={() => setShowPreview(true)}
      disabled={isNavigating}
      aria-label={t("openDraftPreview")}
    >
      <Eye className="h-5 w-5" />
    </SurfaceIconButton>
  ) : null;

  const primaryCta = canProceed ? (
    <PrimaryButton
      onClick={() => {
        void handleConfirm();
      }}
      disabled={updateDraft.isPending}
      loading={updateDraft.isPending || Boolean(isNavigating)}
    >
      {t("continueToAttachments")}
    </PrimaryButton>
  ) : (
    <PrimaryButton onClick={handleBlockedConfirm} tone="warning" hideIcon>
      {t("continueToAttachments")}
    </PrimaryButton>
  );

  const quickActionBadges = !isAiBusy ? (
    <PromptShortcutBar
      primaryShortcuts={primaryQuickRefineActions.map((action) => ({
        ...action,
        description: action.prompt,
      }))}
      overflowShortcuts={overflowQuickRefineActions.map((action) => ({
        ...action,
        description: action.prompt,
      }))}
      moreLabel={t("bodyQuickActionsMore")}
      sheetTitle={t("bodyShortcutSheetTitle")}
      sheetDescription={t("bodyShortcutSheetHint")}
      closeLabel={tc("close")}
      disabled={isAiBusy}
      isCompactViewport={isCompactViewport}
      compactPrimaryCount={2}
      onShortcutSelect={(action) => {
        void handleRefinementShortcut(action.prompt);
      }}
    />
  ) : undefined;

  return (
    <DraftShell
      step={3}
      totalSteps={7}
      title={t("bodyContentTitle")}
      subtitle={undefined}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isComposerFocused || isManualFieldFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      onTogglePreview={onTogglePreview}
      isPreviewPanelVisible={isPreviewPanelVisible}
      primaryAction={
        previewButton || primaryCta ? (
          <div className="flex items-center gap-3">
            {previewButton}
            {primaryCta ? <div className="flex-1">{primaryCta}</div> : null}
          </div>
        ) : null
      }
      composer={
        isAiMode ? (
          <>
            <DraftComposer
              placeholder={t("refineComposerPlaceholder")}
              value={refineText}
              onChange={setRefineText}
              onSend={handleRefine}
              onFocus={() => {
                setIsComposerFocused(true);
                onInputFocusChange?.(true);
              }}
              onBlur={() => {
                setIsComposerFocused(false);
                onInputFocusChange?.(false);
              }}
              helperText={helperText}
              isSending={isAiBusy}
              isCompactViewport={isCompactViewport}
              topBadges={quickActionBadges}
              trailingActions={
                <ComposerIconButton
                  icon={dictation.isRecording ? "stop" : "dictate"}
                  tone="accent"
                  aria-label={
                    dictation.isRecording ? t("stopDictation") : t("startDictation")
                  }
                  disabled={!dictation.isSupported}
                  isActive={dictation.isRecording}
                  onClick={() => {
                    if (dictation.isRecording) {
                      dictation.stopRecording();
                      return;
                    }
                    dictation.startRecording(locale);
                  }}
                />
              }
            />
          </>
        ) : undefined
      }
    >
      <div className="space-y-5 pb-4">
        {/* ── Mode toggle ─────────────────────────────────────────────── */}
        <div className="px-1">
          <SegmentedControl
            options={[
              {
                value: "ai" as const,
                label: t("modeAi"),
                icon: <Sparkles className="h-3 w-3" />,
              },
              {
                value: "manual" as const,
                label: t("modeManual"),
                icon: <Pencil className="h-3 w-3" />,
              },
            ]}
            value={editMode}
            onChange={handleModeChange}
          />
        </div>

        {/* ── AI mode ─────────────────────────────────────────────────── */}
        {isAiMode ? (
          <>
            {/* Draft body card — clean text display */}
            {canProceed ? (
              <Card isCompactViewport={isCompactViewport}>
                <div className="space-y-4">
                  <p className="text-sm italic leading-relaxed text-zinc-400 dark:text-zinc-500">
                    {salutation}
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                    {bodyPreviewText}
                  </div>
                  <p className="pt-1 text-sm italic leading-relaxed text-zinc-400 dark:text-zinc-500">
                    {closing}
                  </p>
                </div>
              </Card>
            ) : (
              <Card isCompactViewport={isCompactViewport}>
                <div className="space-y-4">
                  <p className="text-sm italic leading-relaxed text-zinc-300 dark:text-zinc-600">
                    {salutation}
                  </p>
                  <div className="app-list-item-muted flex items-start gap-3 rounded-2.5xl border border-dashed border-[var(--app-border)] px-4 py-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {t("bodyDraftEmptyTitle")}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {t("bodyDraftEmptyHint")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm italic leading-relaxed text-zinc-300 dark:text-zinc-600">
                    {closing}
                  </p>
                </div>
              </Card>
            )}
            {isAiBusy && canProceed && !shouldShowBodyGenerationDialog ? (
              <Card isCompactViewport={isCompactViewport} density="thin" className="app-list-item-muted">
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <LoadingDots />
                  <span>{tc("loading")}</span>
                </div>
              </Card>
            ) : null}
            {/* Refinement thread — collapsed by default */}
            {hasRefinements ? (
              <div className="px-1">
                <button
                  type="button"
                  onClick={() => setShowRefinementThread((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showRefinementThread ? "rotate-180" : ""}`}
                  />
                  {t("refinementHistoryToggle", {
                    count: refinementMessages.filter((m) => m.role === "user").length,
                  })}
                </button>

                {showRefinementThread ? (
                  <section
                    className="mt-2 space-y-2 px-2"
                    aria-label={t("refinementHistoryLabel")}
                  >
                    {refinementMessages.map((message) => {
                      const isUser = message.role === "user";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2.5xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isUser
                                ? "rounded-br-[8px] bg-zinc-900 text-white dark:bg-zinc-800"
                                : "rounded-bl-[8px] text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {isUser ? message.content : t("refinementAppliedLabel")}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── Manual mode ─────────────────────────────────────────────── */}
        {isManualMode ? (
          <>
            <Card isCompactViewport={isCompactViewport} className="shadow-xl">
              <div className="space-y-4">
                <p className="text-sm italic leading-relaxed text-zinc-400 dark:text-zinc-500">
                  {salutation}
                </p>
                <textarea
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setUserEdited(true);
                  }}
                  onFocus={() => {
                    setIsManualFieldFocused(true);
                    onInputFocusChange?.(true);
                  }}
                  onBlur={() => {
                    setIsManualFieldFocused(false);
                    onInputFocusChange?.(false);
                  }}
                  autoFocus
                  maxLength={10000}
                  placeholder={t("bodyPlaceholder")}
                  className="app-form-control min-h-[300px] w-full resize-none bg-transparent leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <p className="text-sm italic leading-relaxed text-zinc-400 dark:text-zinc-500">
                  {closing}
                </p>
                <div className="text-right text-[10px] text-zinc-400">
                  {bodyText.length.toLocaleString()}/10,000
                </div>
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {shouldShowBodyGenerationDialog ? (
        <BodyGenerationDialog
          open
          status={initialComposeStatus === "error" ? "error" : "loading"}
          loadingTitle={t("bodyGenerationLoadingTitle")}
          loadingDescription={t("bodyGenerationLoadingDescription")}
          errorTitle={t("bodyGenerationErrorTitle")}
          errorDescription={t("bodyGenerationErrorDescription")}
          refreshLabel={t("bodyGenerationRefreshAction")}
          supportLabel={t("bodyGenerationSupportAction")}
          onRefresh={() => window.location.reload()}
        />
      ) : null}

      {showBodyCoachmark && !shouldShowBodyGenerationDialog ? (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/35 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-8 sm:items-center sm:pb-8">
          <div className="app-panel w-full max-w-md rounded-4xl p-5 shadow-2xl">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t("bodyCoachmarkTitle")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t("bodyCoachmarkBody")}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={dismissBodyCoachmark}
                className="inline-flex min-h-11 items-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
              >
                {t("bodyCoachmarkAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPreview ? (
        <LetterPreviewModal
          draftId={draftId}
          onClose={() => setShowPreview(false)}
          onConfirm={() => {
            void handleConfirm();
          }}
          confirmDisabled={!canProceed || updateDraft.isPending}
        />
      ) : null}
    </DraftShell>
  );
}
