"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Eye, FileText, MessageSquareText, Pencil } from "lucide-react";
import { useConversation, useDraft, useDraftFiles, useUpdateDraft } from "../../../hooks/use-api.js";
import { useDictation } from "../../../hooks/use-dictation.js";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave.js";
import { LetterPreviewModal } from "../LetterPreviewModal.js";
import {
  Card,
  ComposerBadge,
  ComposerIconButton,
  DraftComposer,
  DraftShell,
  PrimaryButton,
  StepTriggerButton,
  ThreadActionCard,
} from "./ui.js";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state.js";

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

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
  const [isManualEdit, setIsManualEdit] = useState(false);
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

  function enterManualEdit() {
    setIsComposerFocused(false);
    setIsManualEdit(true);
    onInputFocusChange?.(false);
  }

  function handleDoneEditing() {
    setIsManualFieldFocused(false);
    setIsManualEdit(false);
    onInputFocusChange?.(false);
    if (bodyText.trim() && bodyText !== draft.data?.body) {
      void updateDraft.mutateAsync({ body: bodyText.trim() }).then(() => {
        lastSavedBodyRef.current = bodyText.trim();
      });
    }
  }

  const helperText =
    files.validationError ??
    (dictation.error
      ? t("dictationError")
      : dictation.isRecording
        ? dictation.interimText || t("voicePrimaryHint")
        : undefined);
  const showThreadAction =
    !isManualEdit &&
    canProceed &&
    !conversation.isSending &&
    !conversation.isStreaming &&
    !conversation.isAwaitingResponse;

  return (
    <DraftShell
      step={4}
      totalSteps={6}
      title={t("bodyContentTitle")}
      subtitle={isManualEdit ? t("bodyEditingSubtitle") : t("bodyContentSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isComposerFocused || isManualFieldFocused}
      isCompactViewport={isCompactViewport}
      hideDockStepTrigger={isManualEdit}
      primaryAction={
        isManualEdit ? (
          <PrimaryButton onClick={handleDoneEditing}>
            {t("doneEditing")}
          </PrimaryButton>
        ) : canProceed ? (
          <PrimaryButton
            onClick={() => { void handleConfirm(); }}
            disabled={updateDraft.isPending}
            loading={updateDraft.isPending}
          >
            {t("confirmContent")}
          </PrimaryButton>
        ) : undefined
      }
      composer={
        !isManualEdit ? (
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
                isCompactViewport={isCompactViewport}
                topBadges={
                 <ComposerBadge onClick={enterManualEdit}>
                   {t("editBodyManuallyBadge")}
                 </ComposerBadge>
                }
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
      <div className="space-y-6 pb-4">
        {!isManualEdit && (conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse) ? (
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

        {!isManualEdit && hasRefinements ? (
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

        {!isManualEdit && canProceed ? (
          <Card isCompactViewport={isCompactViewport} className="space-y-3 bg-white/95 dark:bg-zinc-900/95">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                {t("bodyDraftCardLabel")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label={t("openDraftPreview")}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={enterManualEdit}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  <Pencil className="h-4 w-4" />
                  {t("editBodyManuallyBadge")}
                </button>
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto rounded-[20px] bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-700 ring-1 ring-black/5 dark:bg-zinc-950/80 dark:text-zinc-200 dark:ring-white/10">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                <FileText className="h-3.5 w-3.5" />
                <span>{t("bodyDraftCardLabel")}</span>
              </div>
              <div className="whitespace-pre-wrap">{bodyExcerpt}</div>
            </div>
          </Card>
        ) : null}

        {!isManualEdit && !canProceed ? (
          <Card isCompactViewport={isCompactViewport} className="space-y-4 bg-white/95 dark:bg-zinc-900/95">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                <MessageSquareText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {t("bodyDraftEmptyTitle")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {t("bodyDraftEmptyHint")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={enterManualEdit}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <Pencil className="h-4 w-4" />
              {t("editBodyManuallyBadge")}
            </button>
          </Card>
        ) : null}

        {showThreadAction ? (
          <ThreadActionCard
            isCompactViewport={isCompactViewport}
            title={t("bodyThreadActionTitle")}
            description={t("bodyThreadActionHint")}
            actionLabel={t("confirmContent")}
            onAction={() => {
              void handleConfirm();
            }}
            disabled={!canProceed || updateDraft.isPending}
          />
        ) : null}

        {!isManualEdit && canProceed ? (
          <div className="space-y-2 px-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t("bodyQuickActionsLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickRefineActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    void sendRefinementInstruction(action.prompt);
                  }}
                  disabled={conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-300/40 dark:hover:bg-amber-400/10 dark:hover:text-white"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isManualEdit ? (
          <Card
            isCompactViewport={isCompactViewport}
            className="mt-1 bg-white shadow-xl transition-all duration-300 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-6 text-zinc-500 dark:text-zinc-400">
                  {t("bodyManualEditHint")}
                </div>
              </div>
              {canProceed ? (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label={t("openDraftPreview")}
                >
                  <Eye className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <>
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
                className="min-h-[300px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-zinc-800 focus:outline-none dark:text-zinc-100"
              />
              {isManualEdit && (
                <div className="mt-2 text-right text-[10px] text-zinc-400">
                  {bodyText.length}/10,000
                </div>
              )}
            </>
          </Card>
        ) : null}
      </div>

      {showPreview ? (
        <LetterPreviewModal
          draft={draft.data}
          onClose={() => setShowPreview(false)}
          onEditManually={enterManualEdit}
          onConfirm={() => { void handleConfirm(); }}
          confirmDisabled={!canProceed || updateDraft.isPending}
        />
      ) : null}
    </DraftShell>
  );
}
