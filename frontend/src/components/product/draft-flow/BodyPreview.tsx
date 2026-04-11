"use client";

import { MessageSquareText } from "lucide-react";
import { memo } from "react";
import { LoadingDots } from "../../ui/loading-dots";
import { BodyRefinementThread } from "./BodyRefinementThread";
import { Card } from "./ui";
import type { EditMode } from "./bodyStepReducer";

interface RefinementMessage {
  id: string;
  role: string;
  content: string;
}

interface BodyPreviewProps {
  editMode: EditMode;
  isCompactViewport?: boolean | undefined;
  canProceed: boolean;
  bodyText: string;
  bodyPreviewText: string;
  salutation: string;
  closing: string;
  showRefinementLoadingCard: boolean;
  loadingLabel: string;
  hasRefinements: boolean;
  showRefinementThread: boolean;
  refinementMessages: RefinementMessage[];
  refinementToggleLabel: string;
  refinementHistoryLabel: string;
  refinementAppliedLabel: string;
  emptyTitle: string;
  emptyHint: string;
  placeholder: string;
  onToggleRefinementThread: () => void;
  onManualTextChange: (value: string) => void;
  onManualFocusChange: (focused: boolean) => void;
}

export const BodyPreview = memo(function BodyPreview({
  editMode,
  isCompactViewport,
  canProceed,
  bodyText,
  bodyPreviewText,
  salutation,
  closing,
  showRefinementLoadingCard,
  loadingLabel,
  hasRefinements,
  showRefinementThread,
  refinementMessages,
  refinementToggleLabel,
  refinementHistoryLabel,
  refinementAppliedLabel,
  emptyTitle,
  emptyHint,
  placeholder,
  onToggleRefinementThread,
  onManualTextChange,
  onManualFocusChange,
}: BodyPreviewProps) {
  if (editMode === "manual") {
    return (
      <Card isCompactViewport={isCompactViewport} className="shadow-xl">
        <div className="space-y-4">
          <p className="text-sm italic leading-relaxed text-zinc-400 dark:text-zinc-500">
            {salutation}
          </p>
          <textarea
            value={bodyText}
            onChange={(event) => onManualTextChange(event.target.value)}
            onFocus={() => onManualFocusChange(true)}
            onBlur={() => onManualFocusChange(false)}
            autoFocus
            maxLength={10000}
            placeholder={placeholder}
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
    );
  }

  return (
    <>
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
                  {emptyTitle}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {emptyHint}
                </p>
              </div>
            </div>
            <p className="text-sm italic leading-relaxed text-zinc-300 dark:text-zinc-600">
              {closing}
            </p>
          </div>
        </Card>
      )}

      {showRefinementLoadingCard ? (
        <Card isCompactViewport={isCompactViewport} density="thin" className="app-list-item-muted">
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <LoadingDots />
            <span>{loadingLabel}</span>
          </div>
        </Card>
      ) : null}

      {hasRefinements ? (
        <BodyRefinementThread
          isOpen={showRefinementThread}
          messages={refinementMessages}
          toggleLabel={refinementToggleLabel}
          historyLabel={refinementHistoryLabel}
          appliedLabel={refinementAppliedLabel}
          onToggle={onToggleRefinementThread}
        />
      ) : null}
    </>
  );
});
