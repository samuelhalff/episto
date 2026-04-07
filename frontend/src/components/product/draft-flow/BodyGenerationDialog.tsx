"use client";

import { AlertTriangle, LifeBuoy, RefreshCw, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../ui/dialog";
import { PrimaryButton, SecondaryButton } from "./ui";

interface BodyGenerationDialogProps {
  open: boolean;
  status: "loading" | "error";
  loadingTitle: string;
  loadingDescription: string;
  loadingLabel: string;
  errorTitle: string;
  errorDescription: string;
  refreshLabel: string;
  supportLabel: string;
  onRefresh: () => void;
}

export function BodyGenerationDialog({
  open,
  status,
  loadingTitle,
  loadingDescription,
  loadingLabel,
  errorTitle,
  errorDescription,
  refreshLabel,
  supportLabel,
  onRefresh,
}: BodyGenerationDialogProps) {
  const isLoading = status === "loading";

  return (
    <Dialog open={open}>
      <DialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="flex items-end justify-center bg-transparent p-4 sm:items-center sm:p-6"
      >
        <div className="app-panel w-full max-w-lg rounded-4xl p-6 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <div
              className={`inline-flex h-14 w-14 items-center justify-center rounded-3xl ${
                isLoading
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-400/22 dark:text-amber-100 dark:ring-amber-300/25"
                  : "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/14 dark:text-red-200 dark:ring-red-400/18"
              }`}
            >
              {isLoading ? (
                <Sparkles className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <DialogTitle className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {isLoading ? loadingTitle : errorTitle}
            </DialogTitle>

            <DialogDescription className="mt-3 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {isLoading ? loadingDescription : errorDescription}
            </DialogDescription>

            {isLoading ? (
              <div role="status" className="mt-7 w-full rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{loadingLabel}</span>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:-0.2s] dark:bg-amber-300/90" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:-0.1s] dark:bg-amber-300/90" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 dark:bg-amber-300/90" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex w-full flex-col gap-3">
                <PrimaryButton onClick={onRefresh} icon={<RefreshCw className="h-4 w-4" />}>
                  {refreshLabel}
                </PrimaryButton>
                <SecondaryButton disabled icon={<LifeBuoy className="h-4 w-4" />} hideIcon={false}>
                  {supportLabel}
                </SecondaryButton>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
