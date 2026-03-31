"use client";

import { useState, type ReactNode } from "react";

import { ComposerBadge } from "./ui";
import { resolvePromptShortcutLayout } from "./prompt-shortcut-layout";
import { PromptShortcutSheet, type PromptShortcutItem } from "./PromptShortcutSheet";

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
  isCompactViewport?: boolean | undefined;
  compactPrimaryCount?: number | undefined;
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
  isCompactViewport = false,
  compactPrimaryCount,
  onShortcutSelect,
}: PromptShortcutBarProps) {
  const [showShortcutSheet, setShowShortcutSheet] = useState(false);
  const { visiblePrimaryShortcuts, sheetShortcuts } = resolvePromptShortcutLayout({
    primaryShortcuts,
    overflowShortcuts,
    isCompactViewport,
    compactPrimaryCount,
  });

  if (!leadingSlot && visiblePrimaryShortcuts.length === 0 && sheetShortcuts.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`flex min-w-0 max-w-full gap-1.5 px-1 pb-0.5 ${
          isCompactViewport
            ? "flex-wrap overflow-hidden"
            : "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }`}
        aria-label="Prompt shortcuts"
      >
        {leadingSlot}
        {visiblePrimaryShortcuts.map((shortcut) => (
          <ComposerBadge
            key={shortcut.id}
            disabled={disabled}
            onClick={() => onShortcutSelect(shortcut)}
            className={`border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-zinc-600 shadow-sm hover:-translate-y-px hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-950 hover:shadow-[0_10px_30px_rgba(245,158,11,0.12)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:border-[var(--app-border)] disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] disabled:shadow-none dark:text-[var(--app-muted-strong)] dark:hover:bg-amber-400/10 dark:hover:text-[var(--app-fg)] dark:hover:shadow-[0_14px_34px_rgba(245,158,11,0.1)] dark:disabled:text-[var(--app-muted)] ${
              isCompactViewport
                ? "min-w-0 max-w-full truncate"
                : "shrink-0 whitespace-nowrap"
            }`}
          >
            {shortcut.label}
          </ComposerBadge>
        ))}
        {sheetShortcuts.length > 0 ? (
          <ComposerBadge
            disabled={disabled}
            onClick={() => setShowShortcutSheet(true)}
            className={`border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-zinc-700 shadow-sm hover:-translate-y-px hover:border-amber-300/80 hover:bg-[var(--app-surface)] hover:text-zinc-950 hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:border-[var(--app-border)] disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] disabled:shadow-none dark:text-[var(--app-muted-strong)] dark:hover:text-[var(--app-fg)] dark:hover:shadow-[0_14px_34px_rgba(245,158,11,0.08)] dark:disabled:text-[var(--app-muted)] ${
              isCompactViewport
                ? "min-w-0 max-w-full truncate"
                : "shrink-0 whitespace-nowrap"
            }`}
          >
            {moreLabel}
          </ComposerBadge>
        ) : null}
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
