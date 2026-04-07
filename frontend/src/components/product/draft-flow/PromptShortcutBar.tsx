"use client";

import { useState, type ReactNode } from "react";

import { ComposerBadge } from "./ui";
import { PromptShortcutSheet, type PromptShortcutItem } from "./PromptShortcutSheet";
import { useMeasuredPromptShortcutLayout } from "./useMeasuredPromptShortcutLayout";

export interface PromptShortcutAction extends PromptShortcutItem {
  prompt: string;
}

interface PromptShortcutBarProps {
  leadingSlot?: ReactNode;
  primaryShortcuts: readonly PromptShortcutAction[];
  overflowShortcuts: readonly PromptShortcutAction[];
  moreLabel: string;
  sheetTitle: string;
  sheetDescription: string;
  closeLabel: string;
  disabled?: boolean;
  onShortcutSelect: (shortcut: PromptShortcutAction) => void;
}

export function PromptShortcutBar({
  leadingSlot,
  primaryShortcuts,
  overflowShortcuts,
  moreLabel,
  sheetTitle,
  sheetDescription,
  closeLabel,
  disabled = false,
  onShortcutSelect,
}: PromptShortcutBarProps) {
  const [showShortcutSheet, setShowShortcutSheet] = useState(false);
  const { containerRef, moreRef, shortcutRefs, layout } = useMeasuredPromptShortcutLayout({
    primaryShortcuts,
    overflowShortcuts,
    hasLeadingSlot: Boolean(leadingSlot),
  });
  const { visiblePrimaryShortcuts, sheetShortcuts } = layout;
  const shortcutBadgeClassName =
    "shrink-0 whitespace-nowrap border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-zinc-600 shadow-sm hover:-translate-y-px hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-950 hover:shadow-[0_10px_30px_rgba(245,158,11,0.12)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:border-[var(--app-border)] disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] disabled:shadow-none dark:text-[var(--app-muted-strong)] dark:hover:bg-amber-400/10 dark:hover:text-[var(--app-fg)] dark:hover:shadow-[0_14px_34px_rgba(245,158,11,0.1)] dark:disabled:text-[var(--app-muted)]";
  const moreBadgeClassName =
    "shrink-0 whitespace-nowrap border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-zinc-700 shadow-sm hover:-translate-y-px hover:border-amber-300/80 hover:bg-[var(--app-surface)] hover:text-zinc-950 hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:border-[var(--app-border)] disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] disabled:shadow-none dark:text-[var(--app-muted-strong)] dark:hover:text-[var(--app-fg)] dark:hover:shadow-[0_14px_34px_rgba(245,158,11,0.08)] dark:disabled:text-[var(--app-muted)]";

  if (!leadingSlot && visiblePrimaryShortcuts.length === 0 && sheetShortcuts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0"
        >
          <div className="flex w-max items-center gap-2 px-1 py-1">
            {primaryShortcuts.map((shortcut) => (
              <span
                key={shortcut.id}
                ref={(node) => {
                  if (node) {
                    shortcutRefs.current.set(shortcut.id, node);
                    return;
                  }

                  shortcutRefs.current.delete(shortcut.id);
                }}
                className="shrink-0"
              >
                <ComposerBadge className={shortcutBadgeClassName}>
                  {shortcut.label}
                </ComposerBadge>
              </span>
            ))}
            {overflowShortcuts.length > 0 || primaryShortcuts.length > 1 ? (
              <span ref={moreRef} className="shrink-0">
                <ComposerBadge className={moreBadgeClassName}>{moreLabel}</ComposerBadge>
              </span>
            ) : null}
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-hidden px-1 py-1"
          aria-label="Prompt shortcuts"
        >
          {leadingSlot ? (
            <span className="min-w-0 flex-1">
              {leadingSlot}
            </span>
          ) : null}
          {visiblePrimaryShortcuts.map((shortcut) => (
            <ComposerBadge
              key={shortcut.id}
              disabled={disabled}
              onClick={() => onShortcutSelect(shortcut)}
              className={shortcutBadgeClassName}
            >
              {shortcut.label}
            </ComposerBadge>
          ))}
          {sheetShortcuts.length > 0 ? (
            <ComposerBadge
              disabled={disabled}
              onClick={() => setShowShortcutSheet(true)}
              className={moreBadgeClassName}
            >
              {moreLabel}
            </ComposerBadge>
          ) : null}
        </div>
      </div>

      <PromptShortcutSheet
        open={showShortcutSheet}
        onOpenChange={setShowShortcutSheet}
        title={sheetTitle}
        description={sheetDescription}
        closeLabel={closeLabel}
        shortcuts={sheetShortcuts}
        disabled={disabled}
        onShortcutSelect={(shortcut) => {
          const selectedShortcut = sheetShortcuts.find((item) => item.id === shortcut.id);
          if (selectedShortcut) {
            onShortcutSelect(selectedShortcut);
          }
        }}
      />
    </>
  );
}
