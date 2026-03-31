"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Link } from "../../i18n/navigation";

interface RecoveryScreenProps {
  statusLabel?: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  onTertiaryAction?: () => void;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function RecoveryScreen({
  statusLabel,
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tertiaryLabel,
  onTertiaryAction,
  icon = <AlertCircle className="h-5 w-5" />,
  className = "",
  style,
}: RecoveryScreenProps) {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-[var(--app-surface-muted)] px-6 py-10 ${className}`}
      style={style}
    >
      <div className="app-panel w-full max-w-xl rounded-4xl p-8 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="text-zinc-600 dark:text-zinc-300">{icon}</span>
            <span>{statusLabel ?? eyebrow}</span>
          </div>

          {eyebrow && statusLabel ? (
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>

          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="cta-sheen inline-flex flex-1 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {primaryLabel}
            </Link>

            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>

          {tertiaryLabel && onTertiaryAction ? (
            <button
              type="button"
              onClick={onTertiaryAction}
              className="mt-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {tertiaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
