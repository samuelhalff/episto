"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";

import {
  getSheetSurfaceClassName,
  SheetBody,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import { SecondaryButton } from "./ui";

export interface PromptShortcutItem {
  id: string;
  label: string;
  description: string;
}

interface PromptShortcutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  closeLabel: string;
  shortcuts: readonly PromptShortcutItem[];
  onShortcutSelect: (shortcut: PromptShortcutItem) => void;
  disabled?: boolean;
}

export function PromptShortcutSheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  shortcuts,
  onShortcutSelect,
  disabled = false,
}: PromptShortcutSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={`${getSheetSurfaceClassName("action")} max-h-[78svh] md:bottom-6 md:left-1/2 md:w-[min(640px,calc(100vw-2rem))] md:max-h-[72vh] md:-translate-x-1/2 md:rounded-4xl`}
      >
        <SheetHandle className="pt-3" />
        <SheetHeader>
          <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </SheetTitle>
          <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-3 py-3 sm:px-4">
          <div className="space-y-1.5">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onShortcutSelect(shortcut);
                  onOpenChange(false);
                }}
                className="app-list-item group relative flex w-full items-center gap-3 overflow-hidden rounded-[24px] px-3 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:outline-amber-200/80 hover:shadow-[0_18px_42px_rgba(245,158,11,0.12)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:outline-[var(--app-border)] disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] disabled:hover:translate-y-0 disabled:hover:shadow-none dark:hover:outline-amber-300/20 dark:hover:shadow-[0_22px_48px_rgba(245,158,11,0.08)]"
              >
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100/90 transition-colors duration-200 group-hover:bg-amber-100 group-hover:text-amber-800 dark:bg-amber-400/12 dark:text-amber-200 dark:ring-amber-300/18 dark:group-hover:bg-amber-400/18 dark:group-hover:text-amber-100"
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-[13px] font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
                    {shortcut.label}
                  </div>
                  <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {shortcut.description}
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-100/90 bg-white/90 text-amber-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:border-amber-200 group-hover:text-amber-800 dark:border-amber-300/18 dark:bg-[var(--app-surface)] dark:text-amber-200 dark:group-hover:border-amber-300/30 dark:group-hover:text-amber-100"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </SheetBody>

        <SheetFooter>
          <SecondaryButton onClick={() => onOpenChange(false)} hideIcon>
            {closeLabel}
          </SecondaryButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
