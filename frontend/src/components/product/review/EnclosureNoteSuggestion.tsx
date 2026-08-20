"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FileAsset } from "@episto/shared";
import type { useUpdateDraft } from "@/hooks/use-api";
import { ActionButton } from "../ActionButton";

const ENCLOSURE_SUGGESTION_DISMISS_KEY = "episto.enclosure-suggestion-dismissed.v1.";

function readEnclosureSuggestionDismissed(draftId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(ENCLOSURE_SUGGESTION_DISMISS_KEY + draftId) === "1"
    );
  } catch {
    return false;
  }
}

function writeEnclosureSuggestionDismissed(draftId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ENCLOSURE_SUGGESTION_DISMISS_KEY + draftId, "1");
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

/**
 * Offers the conventional Swiss enclosures line ("Beilage: …") derived from
 * the PDFs that are actually mailed, when the user has not written one.
 * Editable and declinable; declining is remembered per draft and never
 * changes which files are dispatched.
 */
export function EnclosureNoteSuggestion({
  draftId,
  mailedPdfs,
  updateDraft,
}: {
  draftId: string;
  mailedPdfs: FileAsset[];
  updateDraft: ReturnType<typeof useUpdateDraft>;
}) {
  const t = useTranslations("review");
  const [dismissed, setDismissed] = useState(() =>
    readEnclosureSuggestionDismissed(draftId),
  );
  const [editing, setEditing] = useState(false);
  const suggestedText = useMemo(() => {
    const names = mailedPdfs.map(
      (file, index) => file.originalFilename ?? `#${index + 1}`,
    );
    return t("enclosureSuggestionPrefix") + names.join(", ");
  }, [mailedPdfs, t]);
  const [noteValue, setNoteValue] = useState(suggestedText);

  const handleDecline = useCallback(() => {
    writeEnclosureSuggestionDismissed(draftId);
    setDismissed(true);
  }, [draftId]);

  if (dismissed) return null;

  return (
    <section className="app-panel-muted rounded-[2rem] p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {t("enclosureSuggestionTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("enclosureSuggestionBody")}
        </p>
      </div>

      {editing ? (
        <input
          value={noteValue}
          onChange={(event) => setNoteValue(event.target.value)}
          className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-50"
        />
      ) : (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50">
          {suggestedText}
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {t("enclosureSuggestionHelp")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="primary"
          loading={updateDraft.isPending}
          disabled={updateDraft.isPending}
          onClick={() =>
            void updateDraft.mutateAsync({
              enclosureNote: editing ? noteValue : suggestedText,
            })
          }
        >
          {t("enclosureSuggestionAdd")}
        </ActionButton>
        {!editing ? (
          <ActionButton variant="secondary" onClick={() => setEditing(true)}>
            {t("enclosureSuggestionEdit")}
          </ActionButton>
        ) : null}
        <ActionButton variant="secondary" onClick={handleDecline}>
          {t("enclosureSuggestionDecline")}
        </ActionButton>
      </div>
    </section>
  );
}
