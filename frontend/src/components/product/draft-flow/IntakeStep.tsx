"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, FileText, Hash, Lightbulb, Mail, RotateCcw } from "lucide-react";
import { useConversation } from "../../../hooks/use-conversation";
import { useDraft, useDraftFiles, useUpdateDraft } from "../../../hooks/use-api";
import { useDictation } from "../../../hooks/use-dictation";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave";
import {
  ComposerBadge,
  ComposerIconButton,
  DraftComposer,
  DraftShell,
  ThreadActionCard,
  StepTriggerButton,
} from "./ui";
import { LoadingDots } from "../../ui/loading-dots";
import {
  getIntakeThreadActionMode,
  isTemporaryAiFailureMessage,
} from "./intake-thread-state";
import { getIntakeShortcutDefinitions } from "./intake-shortcuts";
import {
  mergeShortcutIntoComposerValue,
  shouldSendShortcutImmediately,
} from "./prompt-shortcut-behavior";
import { PromptShortcutBar } from "./PromptShortcutBar";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state";

interface IntakeStepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
  isNavigating?: boolean;
  navigateToStep?: (step: "intake" | "sender" | "recipient" | "body" | "subject" | "logistics") => void;
  furthestUnlockedStepIndex?: number;
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
}

export function IntakeStep({
  draftId,
  onNext,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  navigateToStep,
  onTogglePreview,
  isPreviewPanelVisible,
}: IntakeStepProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const locale = useLocale();
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const conversation = useConversation(draftId);
  const files = useDraftFiles(draftId);
  const dictation = useDictation();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const threadContainerRef = useRef<HTMLElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const [intakeText, setIntakeText] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const hasHydratedRef = useRef(false);
  const hasAutoScrolledThreadRef = useRef(false);
  const intakeAutosave = useQueuedAutosave({
    value: intakeText,
    enabled: hasHydratedRef.current,
    component: "IntakeStep",
    save: async (nextValue) => {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          intakeInput: nextValue || null,
        }),
      });
    },
  });

  function getScrollableAncestor(node: HTMLElement | null) {
    let current = node?.parentElement ?? null;

    while (current) {
      const style = window.getComputedStyle(current);
      const isScrollable = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;

      if (isScrollable) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const workspaceState = getDraftWorkspaceState(draft.data?.metadata);
    const initialInput = workspaceState.intakeInput ?? "";
    setIntakeText(initialInput);
    intakeAutosave.markPersisted(initialInput);
    hasHydratedRef.current = true;
  }, [draft.data?.metadata, intakeAutosave]);

  useEffect(() => {
    const spokenText = dictation.finalText.trim();
    if (!spokenText) return;

    setIntakeText((current) => `${current.trim()}${current.trim() ? " " : ""}${spokenText}`);
    dictation.resetText();
  }, [dictation.finalText, dictation.resetText]);

  async function handleGenerate() {
    if (!intakeText.trim() || conversation.isSending) return;
    await conversation.sendMessage(intakeText.trim());
    setIntakeText("");
    intakeAutosave.persistInBackground("");
  }

  async function handleIntakeShortcut(prompt: string) {
    if (!shouldSendShortcutImmediately(intakeText)) {
      setIntakeText((current) => mergeShortcutIntoComposerValue(current, prompt));
      return;
    }

    if (conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse) {
      return;
    }

    await conversation.sendMessage(prompt);
    setIntakeText("");
    intakeAutosave.persistInBackground("");
  }

  const helperText =
    files.validationError ??
    (dictation.error
      ? t("dictationError")
      : dictation.isRecording
        ? dictation.interimText || t("voicePrimaryHint")
        : undefined);
  const hasConversationActivity =
    conversation.messages.length > 0 ||
    conversation.isSending ||
    conversation.isStreaming ||
    conversation.isAwaitingResponse;
  const threadActionMode = getIntakeThreadActionMode(
    draft.data ?? null,
    conversation.messages,
  );
  const showThreadAction =
    threadActionMode === "prominent" &&
    !conversation.isSending &&
    !conversation.isStreaming &&
    !conversation.isAwaitingResponse;
  const showSubtleManualLink =
    threadActionMode === "subtle" &&
    !conversation.isSending &&
    !conversation.isStreaming &&
    !conversation.isAwaitingResponse;
  const intakeTips = [
    {
      title: t("tipFullContext"),
      desc: t("tipFullContextDesc"),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: t("tipDates"),
      desc: t("tipDatesDesc"),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: t("tipReferences"),
      desc: t("tipReferencesDesc"),
      icon: <Hash className="h-4 w-4" />,
    },
    {
      title: t("tipContact"),
      desc: t("tipContactDesc"),
      icon: <Mail className="h-4 w-4" />,
    },
  ];
  const intakeShortcuts = useMemo(() => {
    const definitions = getIntakeShortcutDefinitions();
    return {
      primary: definitions.primary.map((shortcut) => ({
        id: shortcut.id,
        label: t(shortcut.labelKey),
        prompt: t(shortcut.promptKey),
        description: t(shortcut.promptKey),
      })),
      overflow: definitions.overflow.map((shortcut) => ({
        id: shortcut.id,
        label: t(shortcut.labelKey),
        prompt: t(shortcut.promptKey),
        description: t(shortcut.promptKey),
      })),
    };
  }, [t]);

  useEffect(() => {
    if (!hasConversationActivity) {
      hasAutoScrolledThreadRef.current = false;
      return;
    }

    if (!threadEndRef.current) {
      return;
    }

    const behavior = hasAutoScrolledThreadRef.current ? "smooth" : "auto";
    let cancelled = false;

    const scrollThreadToBottom = () => {
      if (cancelled || !threadEndRef.current) {
        return;
      }

      threadEndRef.current.scrollIntoView({ block: "end", behavior });

      const scrollContainer = getScrollableAncestor(threadEndRef.current);
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior });
      }

      hasAutoScrolledThreadRef.current = true;
    };

    const frameId = window.requestAnimationFrame(() => {
      scrollThreadToBottom();

      window.requestAnimationFrame(() => {
        scrollThreadToBottom();
      });
    });

    const timeoutId = window.setTimeout(() => {
      scrollThreadToBottom();
    }, 120);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [
    conversation.isAwaitingResponse,
    conversation.isSending,
    conversation.isStreaming,
    conversation.messages.length,
    hasConversationActivity,
  ]);
  const intakeComposer = (
    <>
      <DraftComposer
        placeholder={t("intakeComposerPlaceholder")}
        value={intakeText}
        onChange={setIntakeText}
        onSend={handleGenerate}
        onFocus={() => {
          setIsComposerFocused(true);
          onInputFocusChange?.(true);
        }}
        onBlur={() => {
          setIsComposerFocused(false);
          onInputFocusChange?.(false);
        }}
        helperText={helperText}
        isSending={
          conversation.isSending ||
          conversation.isStreaming ||
          conversation.isAwaitingResponse
        }
        isCompactViewport={isCompactViewport}
        topBadges={
          <PromptShortcutBar
            leadingSlot={
              <ComposerBadge
                onClick={() => navigateToStep?.("sender")}
                className="min-w-0 max-w-full truncate"
              >
                {t("manualFlowBadge")}
              </ComposerBadge>
            }
            primaryShortcuts={intakeShortcuts.primary}
            overflowShortcuts={intakeShortcuts.overflow}
            moreLabel={t("intakeQuickActionsMore")}
            sheetTitle={t("intakeShortcutSheetTitle")}
            sheetDescription={t("intakeShortcutSheetHint")}
            closeLabel={tc("close")}
            disabled={conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse}
            isCompactViewport={isCompactViewport}
            compactPrimaryCount={1}
            onShortcutSelect={(shortcut) => {
              void handleIntakeShortcut(shortcut.prompt);
            }}
          />
        }
        leadingActions={
          <>
            {isCompactViewport ? (
              <StepTriggerButton
                size="composer"
                isOpen={isStepMenuOpen}
                aria-label={t("stepMenuLabel")}
                disabled={isNavigating}
                onClick={onStepClick}
              />
            ) : null}
            {onTogglePreview ? (
              <ComposerIconButton
                icon={isPreviewPanelVisible ? "preview-off" : "preview"}
                aria-label={isPreviewPanelVisible ? tc("hidePreview") : tc("showPreview")}
                onClick={onTogglePreview}
              />
            ) : null}
            <ComposerIconButton
              icon="attach"
              aria-label={t("attachmentsLabel")}
              badgeCount={files.attachments.length}
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
  );

  return (
    <DraftShell
      step={0}
      totalSteps={7}
      title={t("intakeTitle")}
      subtitle={t("intakeSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isComposerFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      onTogglePreview={onTogglePreview}
      isPreviewPanelVisible={isPreviewPanelVisible}
      hideDockStepTrigger
      composer={intakeComposer}
    >
      <div className="flex flex-1 h-full min-h-full flex-col justify-end gap-8 pb-4">
        {hasConversationActivity ? (
          <section ref={threadContainerRef} className="mt-auto space-y-3 px-2" aria-live="polite">
            {conversation.messages.map((message) => {
              const isUserMessage = message.role === "user";
              const showRetryAction =
                message.role === "assistant" &&
                isTemporaryAiFailureMessage(message.content) &&
                !conversation.isSending &&
                !conversation.isStreaming &&
                !conversation.isAwaitingResponse;

              return (
                <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[min(88%,40rem)] ${isUserMessage ? "" : "space-y-2"}`}>
                    <div
                      className={`rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ring-1 ring-black/5 ${
                        isUserMessage
                          ? "rounded-br-[10px] bg-zinc-900 text-white dark:bg-zinc-800"
                          : "rounded-bl-[10px] bg-transparent px-0 text-zinc-700 shadow-none ring-0 dark:text-zinc-100"
                      }`}
                    >
                      {message.content}
                    </div>
                    {showRetryAction ? (
                      <button
                        type="button"
                        onClick={() => {
                          void conversation.retryLast(message.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-full px-0 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {tc("tryAgain")}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {conversation.isSending || conversation.isStreaming || conversation.isAwaitingResponse ? (
              <div className="flex justify-start">
                <div className="max-w-[min(88%,40rem)] rounded-3xl rounded-bl-[10px] bg-[var(--app-surface-soft)] px-4 py-3 text-sm leading-relaxed text-zinc-700 shadow-sm ring-1 ring-black/5 dark:text-zinc-100 dark:ring-white/5">
                  {conversation.streamingText ? (
                    <div className="whitespace-pre-wrap">
                      {conversation.streamingText}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <LoadingDots />
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {conversation.pendingAssistantPlaceholder ? tc("loading") : tc("loading")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {showThreadAction ? (
              <ThreadActionCard
                isCompactViewport={isCompactViewport}
                title={t("intakeThreadActionTitle")}
                description={t("intakeThreadActionHint")}
                actionLabel={t("continueToSender")}
                onAction={onNext}
              />
            ) : null}
            {showSubtleManualLink ? (
              <div className="space-y-1 px-2">
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {t("intakeThreadSoftHint")}
                </p>
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center px-0 text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 dark:text-zinc-200 dark:decoration-zinc-600 dark:hover:text-zinc-50"
                >
                  {t("intakeThreadSoftAction")}
                </button>
              </div>
            ) : null}
            <div ref={threadEndRef} />
          </section>
        ) : (
          <section className="px-2">
            <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              {t("proTips")}
            </div>
            <ul className="space-y-2">
              {intakeTips.map((tip) => (
                <li key={tip.title} className="flex items-baseline gap-2.5 py-0.5">
                  <span className="text-zinc-400 dark:text-zinc-500">{tip.icon}</span>
                  <p className="text-sm leading-5">
                    <span className="font-semibold text-zinc-950 dark:text-zinc-50">{tip.title}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">{" — "}{tip.desc}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DraftShell>
  );
}
