"use client";

import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";
import { AppButton } from "../ui/app-button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmLoading?: boolean;
}

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
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dismissalBlocked = cancelDisabled || confirmLoading;
  const handleEscapeKeyDown: NonNullable<
    ComponentProps<typeof DialogContent>["onEscapeKeyDown"]
  > = (event) => {
    if (dismissalBlocked) {
      event.preventDefault();
    }
  };
  const handlePointerDownOutside: NonNullable<
    ComponentProps<typeof DialogContent>["onPointerDownOutside"]
  > = (event) => {
    if (dismissalBlocked) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }

    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent
        aria-modal="true"
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        className="flex items-center justify-center bg-transparent p-6"
      >
        <div className="app-panel w-full max-w-sm rounded-3xl p-6 text-center shadow-prominent-warm dark:shadow-prominent">
          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
          <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {description}
            </DialogDescription>
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
      </DialogContent>
    </Dialog>
  );
}
