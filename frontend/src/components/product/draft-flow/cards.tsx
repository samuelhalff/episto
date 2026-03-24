"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";

function getCardClasses(isCompactViewport: boolean, density: "default" | "thin") {
  const roundedClass = isCompactViewport ? "rounded-[20px]" : "rounded-[24px]";
  const paddingClass = density === "thin" && isCompactViewport ? "p-4" : "p-5";

  return `${roundedClass} bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 ${paddingClass}`;
}

export function Card({
  children,
  className = "",
  isCompactViewport = false,
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  isCompactViewport?: boolean | undefined;
  density?: "default" | "thin" | undefined;
}) {
  return (
    <div className={`${getCardClasses(isCompactViewport, density)} ${className}`}>
      {children}
    </div>
  );
}

interface ActionCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isCompactViewport?: boolean | undefined;
  selected?: boolean | undefined;
  selectedClassName?: string | undefined;
  unselectedClassName?: string | undefined;
}

export function ActionCard({
  children,
  className = "",
  isCompactViewport = false,
  selected = false,
  selectedClassName = "",
  unselectedClassName = "",
  type = "button",
  ...props
}: ActionCardProps) {
  return (
    <button
      type={type}
      className={`${getCardClasses(isCompactViewport, "thin")} w-full transition-all active:scale-[0.98] ${
        selected ? selectedClassName : unselectedClassName
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface DashedCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isCompactViewport?: boolean | undefined;
}

export function DashedCard({
  children,
  className = "",
  isCompactViewport = false,
  type = "button",
  ...props
}: DashedCardProps) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center border-2 border-dashed border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 ${
        isCompactViewport ? "rounded-[20px] p-4" : "rounded-[24px] p-6"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface PrimaryButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: (() => void) | undefined;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({
  children,
  icon,
  onClick,
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-sm font-bold transition-all ${
        isDisabled
          ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          : "bg-zinc-950 text-white active:scale-[0.98] dark:bg-amber-400 dark:text-zinc-950"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        !isDisabled && (icon ?? <Check className="h-4 w-4" />)
      )}
      <span>{children}</span>
    </button>
  );
}

interface ThreadActionCardProps {
  title?: string;
  description?: string;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
  isCompactViewport?: boolean | undefined;
}

export function ThreadActionCard({
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
  isCompactViewport = false,
}: ThreadActionCardProps) {
  return (
    <Card
      isCompactViewport={isCompactViewport}
      density="thin"
      className="space-y-3 bg-zinc-50/80 dark:bg-zinc-900/80"
    >
      {title ? <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p> : null}
      {description ? (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</p>
      ) : null}
      <PrimaryButton onClick={onAction} disabled={disabled}>
        {actionLabel}
      </PrimaryButton>
    </Card>
  );
}
