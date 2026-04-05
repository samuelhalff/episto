"use client";

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "warning"
  | "destructive"
  | "ghost";

export type AppButtonSize = "sm" | "md" | "lg" | "icon";

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  trailingMeta?: ReactNode;
}

const SIZE_CLASSNAMES: Record<AppButtonSize, string> = {
  sm: "min-h-10 rounded-2xl px-4 py-2 text-sm",
  md: "min-h-12 rounded-2xl px-5 py-3.5 text-sm",
  lg: "min-h-14 rounded-2xl px-5 py-3.5 text-sm",
  icon: "h-10 w-10 rounded-full p-0 text-sm",
};

export function getAppButtonClassName(options?: {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const {
    variant = "primary",
    size = "md",
    fullWidth = false,
    className = "",
  } = options ?? {};

  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "warning"
          ? "btn-warning"
          : variant === "destructive"
            ? "btn-destructive"
            : "btn-ghost";

  return [
    variantClass,
    "inline-flex min-w-0 items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200",
    SIZE_CLASSNAMES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    leadingIcon,
    trailingIcon,
    trailingMeta,
    className = "",
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={getAppButtonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : leadingIcon}
      {children ? <span className="min-w-0 truncate">{children}</span> : null}
      {!loading ? trailingMeta : null}
      {!loading ? trailingIcon : null}
    </button>
  );
});
