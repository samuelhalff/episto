import type { ComponentPropsWithoutRef, ReactNode } from "react";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export type MarketingIconTone =
  | "muted"
  | "primary"
  | "accent"
  | "sky"
  | "emerald"
  | "amber"
  | "rose";

const TONE_CLASS_NAMES: Record<MarketingIconTone, string> = {
  muted: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  primary:
    "bg-[color-mix(in_srgb,var(--action-primary-bg)_24%,white)] text-zinc-950 dark:text-zinc-50",
  accent:
    "bg-[var(--app-surface-soft)] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100",
};

export function MarketingIconToken({
  children,
  className,
  tone = "muted",
  ...props
}: ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
  tone?: MarketingIconTone;
}) {
  return (
    <span
      {...props}
      className={cx(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full [&>svg]:size-5",
        TONE_CLASS_NAMES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
