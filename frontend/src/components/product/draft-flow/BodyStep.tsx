"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Eye, MessageSquareText, Pencil, Sparkles } from "lucide-react";
import { useConversation, useDraft, useDraftFiles, useUpdateDraft } from "../../../hooks/use-api.js";
import { useDictation } from "../../../hooks/use-dictation.js";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave.js";
import { LetterPreviewModal } from "../LetterPreviewModal.js";
import {
  Card,
  ComposerIconButton,
  DraftComposer,
  DraftShell,
  PrimaryButton,
  SegmentedControl,
  StepTriggerButton,
} from "./ui.js";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

type EditMode = "ai" | "manual";

// ---------------------------------------------------------------------------
// BodyStep
// ---------------------------------------------------------------------------

export function BodyStep({
  draftId,
  onNext,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
}: StepProps) {
  const t = useTranslations("draft");
  const locale = useLocale();
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const conversation = useConversation(draftId);
  const files = useDraftFiles(draftId);
  const dictation = useDictation();
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [showRefinementThread, setShowRefinementThread] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("ai");
  const [bodyText, setBodyText] = useState("");
  const [userEdited, setUserEdited] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isManualFieldFocused, setIsManualFieldFocused] = useState(false);
  const hasHydratedRef = useRef(false);
  const lastSavedBodyRef = useRef("");
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
    setBodyText(draft.data?.body ?? "");
    setRefineText(workspaceState.bodyRefineInput ?? "");
    lastSavedBodyRef.current = draft.data?.body ?? "";
    refineAutosave.markPersisted(workspaceState.bodyRefineInput ?? "");
    hasHydratedRef.current = true;
  }, [draft.data?.body, draft.data?.metadata, refineAutosave]);

  useEffect(() => {
    if (!userEdited) {
      setBodyText(draft.data?.body ?? "");
      lastSavedBodyRef.current = draft.data?.body ?? "";
    }
  }, [draft.data?.body, userEdited]);

  useEffect(() => {
    const spokenText = dictation.finalText.trim();
    if (!spokenText) return;

    setRefineText((current) => `${current.trim()}${current.trim() ? " " : ""}${spokenText}`);
    dictation.resetText();
  }, [dictation.finalText, dictation.resetText]);

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

  const canProceed = bodyText.trim().length > 0;

  // Messages beyond the initial intake pair (user + assistant) are refinements
  const refinementMessages = useMemo(() => {
    const msgs = conversation.messages;
    // The first user+assistant exchange is the intake generation.
    // Everything after that is a BodyStep refinement.
    let firstAssistantSeen = false;
    let startIndex = 0;
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i]!.role === "assistant") {
        firstAssistantSeen = true;
      } else if (firstAssistantSeen && msgs[i]!.role === "user") {
        startIndex = i;
        break;
      }
    }
    return firstAssistantSeen ? msgs.slice(startIndex) : [];
  }, [conversation.messages]);
  const hasRefinements = refinementMessages.length > 0;
  const bodyPreviewText = bodyText.trim();
  const bodyExcerpt =
    bodyPreviewText.length > 320 ? `${bodyPreviewText.slice(0, 320).trimEnd()}…` : bodyPreviewText;
  const quickRefineActions = [
    {
      id: "formal",
      label: t("bodyQuickActionFormal"),
      prompt: t("bodyQuickActionFormalPrompt"),
    },
    {
      id: "shorter",
      label: t("bodyQuickActionShorter"),
      prompt: t("bodyQuickActionShorterPrompt"),
    },
    {
      id: "firmer",
      label: t("bodyQuickActionFirmer"),
      prompt: t("bodyQuickActionFirmerPrompt"),
    },
    {
      id: "deadline",
      label: t("bodyQuickActionDeadline"),
      prompt: t("bodyQuickActionDeadlinePrompt"),
    },
  ] as const;

  async function sendRefinementInstruction(instruction: string) {
    if (!instruction.trim() || conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse) {
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

  async function handleConfirm() {
    if (!canProceed || updateDraft.isPending) return;
    await updateDraft.mutateAsync({ body: bodyText.trim() });
    lastSavedBodyRef.current = bodyText.trim();
    onNext();
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


  const helperText =
    files.validationError ??
    (dictation.error
      ? t("dictationError")
      : dictation.isRecording
        ? dictation.interimText || t("voicePrimaryHint")
        : undefined);

  const isAiMode = editMode === "ai";
  const isManualMode = editMode === "manual";
  const isAiBusy = conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse;

  // ── Dock: [Step trigger] [👁 Preview] [Primary CTA] ──────────────────────
  const previewButton = canProceed ? (
    <button
      type="button"
      onClick={() => setShowPreview(true)}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-zinc-600 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
      aria-label={t("openDraftPreview")}
    >
      <Eye className="h-5 w-5" />
    </button>
  ) : null;

  const primaryCta = canProceed ? (
    <PrimaryButton
      onClick={() => { void handleConfirm(); }}
      disabled={updateDraft.isPending}
      loading={updateDraft.isPending}
    >
      {t("confirmContent")}
    </PrimaryButton>
  ) : undefined;

  return (
    <DraftShell
      step={4}
      totalSteps={6}
      title={t("bodyContentTitle")}
      subtitle={isManualMode ? t("bodyEditingSubtitle") : t("bodyContentSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isComposerFocused || isManualFieldFocused}
      isCompactViewport={isCompactViewport}
      hideDockStepTrigger={isAiMode}
      primaryAction={
        (previewButton || primaryCta) ? (
          <div className="flex items-center gap-2">
            {previewButton}
            {primaryCta ? <div className="flex-1">{primaryCta}</div> : null}
          </div>
        ) : undefined
      }
      composer={
        isAiMode ? (
          <>
            {canProceed && !isAiBusy ? (
              <div className="mb-2 flex gap-1.5 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
                {quickRefineActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => { void sendRefinementInstruction(action.prompt); }}
                    className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-amber-300/40 dark:hover:bg-amber-400/10 dark:hover:text-white"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
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
              isCompactViewport={isCompactViewport}
              leadingActions={
                <>
                  <StepTriggerButton
                    size="composer"
                    isOpen={isStepMenuOpen}
                    aria-label={t("stepMenuLabel")}
                    onClick={onStepClick}
                  />
                  <ComposerIconButton
                    icon="attach"
                    aria-label={t("attachmentsLabel")}
                    disabled={files.isUploading}
                    onClick={() => attachmentInputRef.current?.click()}
                  />
                </>
              }
              trailingActions={
                <ComposerIconButton
                  icon={dictation.isRecording ? "stop" : "dictate"}
                  tone="accent"
                  aria-label={dictation.isRecording ? t("stopDictation") : t("startDictation")}
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
            <input
              ref={attachmentInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  await files.uploadFile(file, "attachment");
                }
                event.target.value = "";
              }}
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
              { value: "ai" as const, label: t("modeAi"), icon: <Sparkles className="h-3 w-3" /> },
              { value: "manual" as const, label: t("modeManual"), icon: <Pencil className="h-3 w-3" /> },
            ]}
            value={editMode}
            onChange={handleModeChange}
          />
        </div>

        {/* ── AI mode ─────────────────────────────────────────────────── */}
        {isAiMode ? (
          <>
            {/* Streaming indicator while AI is working */}
            {isAiBusy ? (
              <div className="px-3 py-1.5">
                {conversation.streamingText ? (
                  <div className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-100">
                    {conversation.streamingText}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300/80 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300/80 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300/80" />
                  </div>
                )}
              </div>
            ) : null}

            {/* Draft body card — clean text display */}
            {canProceed ? (
              <Card isCompactViewport={isCompactViewport} className="bg-white/95 dark:bg-zinc-900/95">
                <div className="max-h-[280px] overflow-y-auto whitespace-pre-wrap text-[14px] leading-7 text-zinc-700 dark:text-zinc-200">
                  {bodyExcerpt}
                </div>
              </Card>
            ) : (
              <Card isCompactViewport={isCompactViewport} className="bg-white/95 dark:bg-zinc-900/95">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                    <MessageSquareText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {t("bodyDraftEmptyTitle")}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t("bodyDraftEmptyHint")}
                    </p>
                  </div>
                </div>
              </Card>
            )}

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
                  {t("refinementHistoryToggle", { count: refinementMessages.filter((m) => m.role === "user").length })}
                </button>

                {showRefinementThread ? (
                  <section className="mt-2 space-y-2 px-2" aria-label={t("refinementHistoryLabel")}>
                    {refinementMessages.map((message) => {
                      const isUser = message.role === "user";
                      return (
                        <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
          <Card
            isCompactViewport={isCompactViewport}
            className="bg-white shadow-xl dark:bg-zinc-900"
          >
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
              className="min-h-[300px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <div className="mt-2 text-right text-[10px] text-zinc-400">
              {bodyText.length.toLocaleString()}/10,000
            </div>
          </Card>
        ) : null}
      </div>

      {showPreview ? (
        <LetterPreviewModal
          draftId={draftId}
          onClose={() => setShowPreview(false)}
          onEditManually={() => handleModeChange("manual")}
          onConfirm={() => { void handleConfirm(); }}
          confirmDisabled={!canProceed || updateDraft.isPending}
        />
      ) : null}
    </DraftShell>
  );
}
