"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getLetterFraming } from "@swiss-mail/shared";
import { stripLetterFramingText } from "@swiss-mail/shared/letter-framing";
import {
  useComposeDraftFromContext,
  useConversation,
  useDraft,
  useDraftFiles,
  useUpdateDraft,
} from "@/hooks/use-api";
import { useDictation } from "@/hooks/use-dictation";
import { useQueuedAutosave } from "@/hooks/use-queued-autosave";
import { getBodyLoadingState } from "./body-loading-state";
import { getBodyShortcutDefinitions } from "./body-shortcuts";
import {
  mergeShortcutIntoComposerValue,
  shouldSendShortcutImmediately,
} from "./prompt-shortcut-behavior";
import { showStepErrorToast } from "./step-feedback";
import { bodyStepReducer, initialBodyStepState, type EditMode } from "./bodyStepReducer";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state";

const BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY =
  "swiss-mail.body-step-first-draft-ready-dismissed.v1";

function getFirstDraftMessageId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const candidate = metadata as Record<string, unknown>;
  return typeof candidate.firstDraftMessageId === "string"
    ? candidate.firstDraftMessageId
    : null;
}

interface UseBodyStepControllerArgs {
  draftId: string;
  onNext: () => void;
  onInputFocusChange?: ((focused: boolean) => void) | undefined;
  onTogglePreview?: (() => void) | undefined;
}

export function useBodyStepController({
  draftId,
  onNext,
  onInputFocusChange,
  onTogglePreview,
}: UseBodyStepControllerArgs) {
  const t = useTranslations("draft");
  const locale = useLocale();
  const draft = useDraft(draftId);
  const files = useDraftFiles(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const composeFromContext = useComposeDraftFromContext(draftId);
  const conversation = useConversation(draftId);
  const dictation = useDictation({ draftId, fieldContext: "refinement" });
  const [state, dispatch] = useReducer(bodyStepReducer, initialBodyStepState);
  const {
    isPending: isComposePending,
    isError: isComposeError,
    mutateAsync: composeDraftFromContext,
  } = composeFromContext;
  const { finalText: dictatedRefineText, resetText: resetDictationText } = dictation;
  const hasHydratedRef = useRef(false);
  const lastSavedBodyRef = useRef("");
  const hasRequestedInitialComposeRef = useRef(false);
  const completionCountAtComposeRef = useRef(0);
  const initialFirstDraftMessageIdRef = useRef<string | null | undefined>(undefined);

  const refineAutosave = useQueuedAutosave({
    value: state.refineText,
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
    dispatch({
      type: "hydrate",
      bodyText: initialBody,
      refineText: workspaceState.bodyRefineInput ?? "",
    });
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
    if (!state.userEdited) {
      dispatch({ type: "set-body-text", value: syncedBody });
      lastSavedBodyRef.current = syncedBody;
    }
  }, [draft.data?.body, draft.data?.locale, locale, state.userEdited]);

  useEffect(() => {
    const spokenText = dictatedRefineText.trim();
    if (!spokenText) return;

    dispatch({ type: "append-refine-text", value: spokenText });
    resetDictationText();
  }, [dictatedRefineText, resetDictationText]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!state.userEdited) return;
    if (state.bodyText === lastSavedBodyRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void updateDraft.mutateAsync({ body: state.bodyText }).then(() => {
        lastSavedBodyRef.current = state.bodyText;
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [state.bodyText, state.userEdited, updateDraft]);

  const requestInitialCompose = useCallback(async () => {
    if (isComposePending) return;
    await composeDraftFromContext();
  }, [composeDraftFromContext, isComposePending]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (state.editMode !== "ai") return;
    if (hasRequestedInitialComposeRef.current) return;
    if (draft.data?.body?.trim() || state.bodyText.trim()) return;
    if (isComposePending) return;
    if (
      conversation.isSending ||
      conversation.isStreaming ||
      conversation.isAwaitingResponse
    ) {
      return;
    }

    const hasConversationContext = conversation.messages.some(
      (message) => message.role === "user" && message.content.trim().length > 0,
    );
    if (!hasConversationContext) return;

    hasRequestedInitialComposeRef.current = true;
    completionCountAtComposeRef.current = conversation.completionCount;
    dispatch({ type: "start-auto-compose" });

    void requestInitialCompose().catch(() => {
      dispatch({ type: "fail-auto-compose" });
    });
  }, [
    conversation.completionCount,
    conversation.isAwaitingResponse,
    conversation.isSending,
    conversation.isStreaming,
    conversation.messages,
    draft.data?.body,
    isComposePending,
    requestInitialCompose,
    state.bodyText,
    state.editMode,
  ]);

  useEffect(() => {
    if (draft.data?.body?.trim()) {
      dispatch({ type: "finish-auto-compose" });
      return;
    }

    if (!state.isAutoComposing) return;

    if (conversation.completionCount > completionCountAtComposeRef.current) {
      if (draft.isFetching || isComposePending) {
        return;
      }

      const completionGraceTimeoutId = window.setTimeout(() => {
        dispatch({ type: "fail-auto-compose" });
      }, 150);

      return () => window.clearTimeout(completionGraceTimeoutId);
    }

    if (isComposeError || conversation.error) {
      dispatch({ type: "fail-auto-compose" });
    }
  }, [
    conversation.completionCount,
    conversation.error,
    draft.data?.body,
    draft.isFetching,
    isComposeError,
    isComposePending,
    state.isAutoComposing,
  ]);

  useEffect(() => {
    if (!state.isAutoComposing) return;

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "fail-auto-compose" });
    }, 45_000);

    return () => window.clearTimeout(timeoutId);
  }, [state.isAutoComposing]);

  const canProceed = state.bodyText.trim().length > 0;
  const { salutation, closing } = useMemo(
    () => getLetterFraming(draft.data?.locale ?? locale),
    [draft.data?.locale, locale],
  );
  const refinementMessages = useMemo(() => {
    const firstDraftMessageId = getFirstDraftMessageId(draft.data?.metadata);
    if (!firstDraftMessageId) {
      return [];
    }

    const firstDraftMessageIndex = conversation.messages.findIndex(
      (message) => message.id === firstDraftMessageId,
    );
    return firstDraftMessageIndex >= 0
      ? conversation.messages.slice(firstDraftMessageIndex + 1)
      : [];
  }, [conversation.messages, draft.data?.metadata]);
  const bodyPreviewText = stripLetterFramingText(
    state.bodyText.trim(),
    draft.data?.locale ?? locale,
  );
  const quickActions = useMemo(() => {
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

  const sendRefinementInstruction = useCallback(
    async (instruction: string) => {
      if (
        !instruction.trim() ||
        conversation.isSending ||
        conversation.isStreaming ||
        conversation.isAwaitingResponse
      ) {
        return;
      }

      await conversation.sendMessage(instruction);
      dispatch({ type: "set-refine-text", value: "" });
      refineAutosave.persistInBackground("");
      dispatch({ type: "set-user-edited", value: false });
    },
    [conversation, refineAutosave],
  );

  const handleRefine = useCallback(() => {
    void sendRefinementInstruction(state.refineText);
  }, [sendRefinementInstruction, state.refineText]);

  const handleShortcutSelect = useCallback(
    (prompt: string) => {
      if (!shouldSendShortcutImmediately(state.refineText)) {
        dispatch({
          type: "set-refine-text",
          value: mergeShortcutIntoComposerValue(state.refineText, prompt),
        });
        return;
      }

      void sendRefinementInstruction(prompt);
    },
    [sendRefinementInstruction, state.refineText],
  );

  async function handleConfirm() {
    if (!canProceed || updateDraft.isPending) return;

    try {
      await updateDraft.mutateAsync({
        body: state.bodyText.trim(),
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          furthestUnlockedStepIndex: 4,
        }),
      });
      lastSavedBodyRef.current = state.bodyText.trim();
      onNext();
    } catch {
      showStepErrorToast({
        id: "body-step-save-error",
        title: t("stepSaveFailed"),
      });
    }
  }

  const handleModeChange = useCallback(
    (mode: EditMode) => {
      if (mode === "manual") {
        dispatch({ type: "set-composer-focused", value: false });
        onInputFocusChange?.(false);
      } else {
        dispatch({ type: "set-manual-field-focused", value: false });
        onInputFocusChange?.(false);
        if (state.bodyText.trim() && state.bodyText !== draft.data?.body) {
          void updateDraft.mutateAsync({ body: state.bodyText.trim() }).then(() => {
            lastSavedBodyRef.current = state.bodyText.trim();
          });
        }
      }

      dispatch({ type: "set-edit-mode", value: mode });
    },
    [draft.data?.body, onInputFocusChange, state.bodyText, updateDraft],
  );

  const helperText = undefined;
  const loadingState = getBodyLoadingState({
    hasBody: canProceed,
    initialComposeStatus: state.initialComposeStatus,
    isSending: conversation.isSending,
    isStreaming: conversation.isStreaming,
    isAwaitingResponse: conversation.isAwaitingResponse,
  });
  const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;

  useEffect(() => {
    const firstDraftMessageId = getFirstDraftMessageId(draft.data?.metadata);

    if (initialFirstDraftMessageIdRef.current === undefined) {
      initialFirstDraftMessageIdRef.current = firstDraftMessageId;
      return;
    }

    if (
      !firstDraftMessageId ||
      shouldShowBodyGenerationDialog ||
      !state.bodyText.trim()
    ) {
      return;
    }

    if (firstDraftMessageId === initialFirstDraftMessageIdRef.current) {
      return;
    }

    try {
      if (
        window.localStorage.getItem(BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY) ===
        "dismissed"
      ) {
        initialFirstDraftMessageIdRef.current = firstDraftMessageId;
        return;
      }
    } catch {
      // Keep the one-time behavior in memory if storage is unavailable.
    }

    initialFirstDraftMessageIdRef.current = firstDraftMessageId;
    dispatch({ type: "set-show-first-draft-ready-dialog", value: true });
  }, [draft.data?.metadata, shouldShowBodyGenerationDialog, state.bodyText]);

  const dismissFirstDraftReadyDialog = useCallback(() => {
    dispatch({ type: "set-show-first-draft-ready-dialog", value: false });

    try {
      window.localStorage.setItem(BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY, "dismissed");
    } catch {
      // Ignore storage access failures; dismiss for the current render session.
    }
  }, []);

  const handleDismissBodyGenerationDialog = useCallback(() => {
    dispatch({ type: "finish-auto-compose" });
  }, []);

  const handlePreviewAction = useCallback(() => {
    if (onTogglePreview) {
      onTogglePreview();
      return;
    }
    dispatch({ type: "set-show-preview", value: true });
  }, [onTogglePreview]);

  return {
    canProceed,
    bodyText: state.bodyText,
    refineText: state.refineText,
    editMode: state.editMode,
    initialComposeStatus: state.initialComposeStatus,
    helperText,
    isComposerFocused: state.isComposerFocused,
    isManualFieldFocused: state.isManualFieldFocused,
    isPreviewOpen: state.showPreview,
    showFirstDraftReadyDialog: state.showFirstDraftReadyDialog,
    showRefinementThread: state.showRefinementThread,
    isUpdatePending: updateDraft.isPending,
    loadingState,
    shouldShowBodyGenerationDialog,
    salutation,
    closing,
    bodyPreviewText,
    refinementMessages,
    dictation,
    quickActions,
    handleConfirm,
    handleModeChange,
    handlePreviewAction,
    handleRefine,
    handleShortcutSelect,
    dismissFirstDraftReadyDialog,
    handleDismissBodyGenerationDialog,
    handleRefineTextChange: (value: string) =>
      dispatch({ type: "set-refine-text", value }),
    handleComposerFocusChange: (focused: boolean) => {
      dispatch({ type: "set-composer-focused", value: focused });
      onInputFocusChange?.(focused);
    },
    handleToggleDictation: () => {
      if (dictation.isRecording) {
        dictation.stopRecording();
        return;
      }
      dictation.clearError();
      dictation.startRecording(locale);
    },
    handleToggleRefinementThread: () => dispatch({ type: "toggle-refinement-thread" }),
    handleManualTextChange: (value: string) =>
      dispatch({ type: "set-body-text", value, userEdited: true }),
    handleManualFocusChange: (focused: boolean) => {
      dispatch({ type: "set-manual-field-focused", value: focused });
      onInputFocusChange?.(focused);
    },
    closePreview: () => dispatch({ type: "set-show-preview", value: false }),
  };
}
