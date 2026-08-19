"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DraftLetter } from "@episto/shared";
import { useDrafts, useSession } from "../../hooks/use-api";
import { getCustomerFlowPath } from "../../lib/customer-flow";
import {
  getDraftWorkspaceStepSlugByIndex,
  getDraftWorkspaceUnlockedStepIndex,
} from "./draft-flow/steps";
import { Link } from "../../i18n/navigation";
import { ActionButton } from "./ActionButton";
import { Dialog, DialogDescription, DialogPanel, DialogTitle } from "../ui/dialog";

const RESUME_PROMPT_SEEN_KEY = "episto.resume-draft-prompt-seen.v1";

function isResumableDraft(draft: DraftLetter): boolean {
  return (
    draft.status !== "closed" &&
    draft.status !== "submitted" &&
    draft.status !== "dispatched"
  );
}

function draftLabel(draft: DraftLetter, fallback: string): string {
  return draft.subject?.trim() || draft.body?.trim().slice(0, 72) || fallback;
}

function getResumePath(draft: DraftLetter): string {
  if (["reviewed", "rendering", "ready", "ready_to_sign"].includes(draft.status)) {
    return getCustomerFlowPath(draft.id, "review");
  }

  return getCustomerFlowPath(
    draft.id,
    getDraftWorkspaceStepSlugByIndex(getDraftWorkspaceUnlockedStepIndex(draft)),
  );
}

export function ResumeDraftPrompt() {
  const t = useTranslations("resumePrompt");
  const session = useSession();
  const drafts = useDrafts(!session.isLoading && Boolean(session.session));
  const [dismissed, setDismissed] = useState(false);
  // Read once at mount; during prerender pretend "seen" so the dialog can
  // only ever appear client-side, after the drafts query resolves.
  const [alreadySeen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.sessionStorage.getItem(RESUME_PROMPT_SEEN_KEY) === "1";
    } catch {
      // The prompt remains best-effort when storage is unavailable.
      return false;
    }
  });
  const hasMarkedSeenRef = useRef(false);

  const resumableDrafts = useMemo(
    () =>
      (drafts.data ?? [])
        .filter(isResumableDraft)
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [drafts.data],
  );

  const ready =
    !session.isLoading &&
    Boolean(session.session) &&
    !drafts.isLoading &&
    !drafts.isError;

  // Persist the once-per-session flag; showing the dialog itself is derived.
  useEffect(() => {
    if (!ready || alreadySeen || hasMarkedSeenRef.current) return;
    hasMarkedSeenRef.current = true;
    try {
      window.sessionStorage.setItem(RESUME_PROMPT_SEEN_KEY, "1");
    } catch {
      // The prompt remains best-effort when storage is unavailable.
    }
  }, [ready, alreadySeen]);

  const open = !alreadySeen && !dismissed && ready && resumableDrafts.length > 0;

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDismissed(true);
      }}
    >
      <DialogPanel size="lg" aria-describedby="resume-drafts-description">
        <DialogTitle className="text-2xl font-semibold tracking-tight text-[var(--app-fg)]">
          {t("title")}
        </DialogTitle>
        <DialogDescription
          id="resume-drafts-description"
          className="mt-2 text-sm leading-6 text-[var(--app-muted)]"
        >
          {t("description")}
        </DialogDescription>

        <div className="mt-6 space-y-3">
          {resumableDrafts.map((draft) => (
            <div
              key={draft.id}
              className="app-list-item-muted flex items-center justify-between gap-4 rounded-2xl p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--app-fg)]">
                  {draftLabel(draft, t("untitled"))}
                </p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  {t("lastUpdated", {
                    value: new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(draft.updatedAt)),
                  })}
                </p>
              </div>
              <Link
                href={getResumePath(draft)}
                onClick={() => setDismissed(true)}
                className="shrink-0 text-sm font-semibold text-amber-700 underline underline-offset-4 dark:text-amber-300"
              >
                {t("continue")}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <ActionButton variant="secondary" onClick={() => setDismissed(true)}>
            {t("dismiss")}
          </ActionButton>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
