"use client";

import type { HTMLAttributes } from "react";

export type StatusBadgeTone = "neutral" | "warning" | "success" | "danger" | "info";

const TONE_CLASS_NAMES: Record<StatusBadgeTone, string> = {
  neutral:
    "bg-[var(--app-surface-soft)] text-[var(--app-muted-strong)] outline outline-1 outline-[var(--app-border)]",
  warning:
    "bg-[var(--action-choice-active-bg)] text-[var(--action-choice-active-fg)] outline outline-1 outline-[var(--action-choice-active-border)]",
  success:
    "bg-emerald-50 text-emerald-700 outline outline-1 outline-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:outline-emerald-500/20",
  danger: "bg-destructive/10 text-destructive outline outline-1 outline-destructive/15",
  info: "bg-sky-50 text-sky-700 outline outline-1 outline-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:outline-sky-500/20",
};

export function StatusBadge({
  tone = "neutral",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: StatusBadgeTone }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-normal",
        TONE_CLASS_NAMES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
