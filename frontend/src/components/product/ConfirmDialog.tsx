"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional icon rendered above the title */
  icon?: ReactNode;
  /** Use destructive styling for the confirm button */
  destructive?: boolean;
}

/**
 * Accessible modal confirmation dialog.
 * Renders a centered card with backdrop, focus trap, and Escape handling.
 * Styled to match the existing warm stone/amber design system.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  icon,
  destructive = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Capture and restore focus
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus the dialog container after mount
      requestAnimationFrame(() => dialogRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px]"
        onClick={onCancel}
        role="presentation"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-[201] flex items-center justify-center p-6 outline-none"
      >
        <div className="w-full max-w-sm rounded-[1.5rem] border border-stone-200/80 bg-white p-6 text-center shadow-[0_30px_90px_rgba(120,53,15,0.12)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
          <h2
            id="confirm-dialog-title"
            className="text-lg font-semibold tracking-tight text-stone-950 dark:text-zinc-50"
          >
            {title}
          </h2>
          {description ? (
            <p
              id="confirm-dialog-desc"
              className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400"
            >
              {description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                destructive
                  ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  : "bg-stone-950 text-white hover:bg-stone-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
              }`}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-300/80 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-transform duration-200 hover:-translate-y-0.5 hover:border-stone-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
