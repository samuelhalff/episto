"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DraftLetter } from "@episto/shared";
import { draftOptions } from "@/hooks/use-draft";
import type { useUpdateDraft } from "@/hooks/use-draft";
import { isUntouchedDraftStarter } from "../../../lib/landing-starters";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "./workspace-state";

/** What happened to the composer text when guidance was turned off (US-5a). */
export type TurnOffOutcome = "starter_cleared" | "text_kept";

interface UseTemplateGuidanceOptions {
  draftId: string;
  updateDraft: ReturnType<typeof useUpdateDraft>;
  /** Current composer text, so a byte-identical starter can be cleared with it. */
  intakeText: string;
  setIntakeText: (value: string) => void;
  /** Flush any pending intake autosave before writing. */
  flushIntake: (value?: string) => Promise<void>;
  /** Tell the autosave what is now on the server so it does not rewrite it. */
  markIntakePersisted: (value: string) => void;
}

interface UseTemplateGuidanceResult {
  isTurningOff: boolean;
  hasTurnOffError: boolean;
  outcome: TurnOffOutcome | null;
  turnOff: () => void;
}

/**
 * Turning template guidance off is a single write, not decoration: the backend
 * re-applies `templateContext` on every turn, so nothing stops until the field
 * is gone from draft metadata.
 *
 * Two races are handled explicitly. First, a pending intake autosave is flushed
 * and awaited before the clear, so it cannot land afterwards carrying stale
 * metadata that still has `templateContext` (the PATCH replaces metadata
 * wholesale). Second, the post-flush metadata is read straight from the query
 * cache rather than from a render-time prop, because the mutation's onSuccess
 * has already written the server response there.
 *
 * Failure leaves guidance visibly on and surfaces an error, rather than
 * silently half-off.
 */
export function useTemplateGuidance({
  draftId,
  updateDraft,
  intakeText,
  setIntakeText,
  flushIntake,
  markIntakePersisted,
}: UseTemplateGuidanceOptions): UseTemplateGuidanceResult {
  const queryClient = useQueryClient();
  const [isTurningOff, setIsTurningOff] = useState(false);
  const [hasTurnOffError, setHasTurnOffError] = useState(false);
  const [outcome, setOutcome] = useState<TurnOffOutcome | null>(null);

  const turnOff = useCallback(() => {
    void (async () => {
      setHasTurnOffError(false);
      setIsTurningOff(true);

      try {
        await flushIntake(intakeText);

        const metadata = queryClient.getQueryData<DraftLetter>(
          draftOptions(draftId).queryKey,
        )?.metadata;
        const slug = getDraftWorkspaceState(metadata).templateContext?.slug ?? null;
        if (!slug) {
          setIsTurningOff(false);
          return;
        }

        // The starter is system-authored, so keeping it would mean guidance is
        // "off" while a template-specific instruction still reaches the model.
        // Anything the user has touched is preserved verbatim. Matched across
        // locales: the draft may have been seeded before a language switch.
        const clearsStarter = isUntouchedDraftStarter(slug, intakeText);
        const nextIntake = clearsStarter ? "" : intakeText;

        await updateDraft.mutateAsync({
          metadata: mergeDraftWorkspaceState(metadata, {
            templateContext: null,
            ...(clearsStarter ? { intakeInput: null } : {}),
          }),
        });

        if (clearsStarter) {
          setIntakeText("");
        }
        markIntakePersisted(nextIntake);
        setOutcome(clearsStarter ? "starter_cleared" : "text_kept");
      } catch {
        setHasTurnOffError(true);
      } finally {
        setIsTurningOff(false);
      }
    })();
  }, [
    draftId,
    flushIntake,
    intakeText,
    markIntakePersisted,
    queryClient,
    setIntakeText,
    updateDraft,
  ]);

  return { isTurningOff, hasTurnOffError, outcome, turnOff };
}
