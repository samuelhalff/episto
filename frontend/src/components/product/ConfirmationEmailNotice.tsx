"use client";

import React from "react";
import { Mail } from "lucide-react";

interface ConfirmationEmailNoticeProps {
  eyebrow: string;
  title: string;
  detail: string;
}

export function ConfirmationEmailNotice({
  eyebrow,
  title,
  detail,
}: ConfirmationEmailNoticeProps) {
  return (
    <section className="app-panel-muted mx-auto max-w-sm rounded-3xl px-5 py-4 text-left">
      <div className="grid grid-cols-[auto_1fr] items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--action-choice-active-bg)] text-[var(--action-primary-fg)]">
          <Mail className="h-5 w-5 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {eyebrow}
          </p>
          <p className="mt-2 text-sm font-semibold leading-5 text-[var(--app-fg)]">
            {title}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {detail}
          </p>
        </div>
      </div>
    </section>
  );
}
