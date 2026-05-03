"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";

interface QesWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function QesWaitlistDialog({ open, onOpenChange }: QesWaitlistDialogProps) {
  const t = useTranslations("signatureTiers.qualified.waitlist");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");

  function reset() {
    setEmail("");
    setState("idle");
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Defer reset so the closing animation does not flash the success state.
      window.setTimeout(reset, 200);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    try {
      await apiFetch<{ ok: boolean }>("/api/v1/waitlist/qes", {
        method: "POST",
        body: JSON.stringify({ email, source: "signature_step" }),
      });
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="qes-waitlist-description"
        className="flex items-end justify-center sm:items-center"
      >
        <div className="w-full max-w-md rounded-t-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-6 shadow-xl sm:rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {t("title")}
              </DialogTitle>
              <p className="text-[12px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-200">
                {t("badge")}
              </p>
            </div>
          </div>

          <DialogDescription
            id="qes-waitlist-description"
            className="mt-3 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            {t("description")}
          </DialogDescription>

          {state === "success" ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t("successMessage")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-zinc-700 dark:text-zinc-200">
                  {t("emailLabel")}
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:text-zinc-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-400/20"
                  disabled={state === "submitting"}
                />
              </label>

              {state === "error" ? (
                <p className="text-[12px] text-red-600 dark:text-red-400">
                  {t("errorMessage")}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <DialogClose
                  className="rounded-full px-4 py-2 text-[12px] font-semibold text-zinc-600 hover:bg-[var(--app-surface)] dark:text-zinc-300"
                  type="button"
                >
                  {t("cancel")}
                </DialogClose>
                <button
                  type="submit"
                  disabled={state === "submitting" || !email}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {state === "submitting" ? t("submitting") : t("submit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
