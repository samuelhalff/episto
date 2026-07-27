"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DraftLetter } from "@episto/shared";
import { draftOptions } from "@/hooks/use-draft";
import type { useUpdateDraft } from "@/hooks/use-draft";
import { isUntouchedDraftStarter } from "../../../lib/landing-starters";
import { getDraftWorkspaceState } from "./workspace-state";

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
 * The clear is a workspace delta, so a concurrent write to another key cannot
 * resurrect `templateContext`. The pending intake autosave is still flushed
 * first, because it writes the same key we may be clearing and would otherwise
 * put the starter back.
 *
 * The composer text is read from a ref at the moment of the write, never from
 * the value captured when the button was clicked: the composer stays editable
 * throughout, and a keystroke during the request makes the text the user's.
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

  // Mirrors the composer so the async turn-off reads what is on screen now, not
  // what was on screen when it started.
  const intakeTextRef = useRef(intakeText);
  intakeTextRef.current = intakeText;

  const turnOff = useCallback(() => {
    void (async () => {
      setHasTurnOffError(false);
      setIsTurningOff(true);

      try {
        await flushIntake(intakeTextRef.current);

        const metadata = queryClient.getQueryData<DraftLetter>(
          draftOptions(draftId).queryKey,
        )?.metadata;
        const slug = getDraftWorkspaceState(metadata).templateContext?.slug ?? null;
        if (!slug) {
          return;
        }

        // The starter is system-authored, so keeping it would mean guidance is
        // "off" while a template-specific instruction still reaches the model.
        // Anything the user has touched is preserved verbatim. Matched across
        // locales: the draft may have been seeded before a language switch.
        const clearsStarter = isUntouchedDraftStarter(slug, intakeTextRef.current);

        await updateDraft.mutateAsync({
          workspacePatch: {
            templateContext: null,
            ...(clearsStarter ? { intakeInput: null } : {}),
          },
        });

        // Re-checked after the round trip: if the user typed while it was in
        // flight, the text is now theirs and clearing it would delete it. The
        // stray server-side null is harmless — the next autosave rewrites it.
        if (clearsStarter && isUntouchedDraftStarter(slug, intakeTextRef.current)) {
          setIntakeText("");
          markIntakePersisted("");
          setOutcome("starter_cleared");
          return;
        }

        // Not touching the composer means the autosave still owns `intakeInput`;
        // telling it what is persisted from here would desynchronize it.
        setOutcome("text_kept");
      } catch {
        setHasTurnOffError(true);
      } finally {
        setIsTurningOff(false);
      }
    })();
  }, [
    draftId,
    flushIntake,
    markIntakePersisted,
    queryClient,
    setIntakeText,
    updateDraft,
  ]);

  return { isTurningOff, hasTurnOffError, outcome, turnOff };
}
