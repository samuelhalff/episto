"use client";

import * as React from "react";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cx(
        "flex h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-2 text-sm text-[var(--app-fg)] shadow-sm outline-none transition placeholder:text-[var(--app-muted)] focus-visible:border-[var(--action-choice-active-border)] focus-visible:ring-2 focus-visible:ring-[var(--action-choice-active-border)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
