import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "./primitives";

export function MarketingIconToken({
  children,
  className,
  tone = "muted",
  ...props
}: ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
  tone?: "muted" | "primary" | "accent";
}) {
  const toneClassName =
    tone === "primary"
      ? "bg-[color-mix(in_srgb,var(--action-primary-bg)_24%,white)] text-zinc-950"
      : tone === "accent"
        ? "bg-[var(--app-surface-soft)] text-zinc-700 dark:text-zinc-200"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

  return (
    <span
      {...props}
      className={cx(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full [&>svg]:size-5",
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  );
}
