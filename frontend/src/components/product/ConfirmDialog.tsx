"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { AppButton } from "../ui/app-button";

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
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmLoading?: boolean;
}

/**
 * Accessible modal confirmation dialog.
 * Renders a centered card with backdrop, focus trap, and Escape handling.
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
  confirmDisabled = false,
  cancelDisabled = false,
  confirmLoading = false,
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
        <div className="app-panel w-full max-w-sm rounded-3xl p-6 text-center shadow-prominent-warm dark:shadow-prominent">
          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
          <h2
            id="confirm-dialog-title"
            className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            {title}
          </h2>
          {description ? (
            <p
              id="confirm-dialog-desc"
              className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <AppButton
              onClick={onConfirm}
              fullWidth
              size="md"
              variant={destructive ? "destructive" : "primary"}
              disabled={confirmDisabled}
              loading={confirmLoading}
            >
              {confirmLabel}
            </AppButton>
            <AppButton
              onClick={onCancel}
              fullWidth
              size="md"
              variant="secondary"
              disabled={cancelDisabled || confirmLoading}
            >
              {cancelLabel}
            </AppButton>
          </div>
        </div>
      </div>
    </>
  );
}
