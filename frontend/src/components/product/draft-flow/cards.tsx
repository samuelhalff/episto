"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { AppButton } from "../../ui/app-button";

function getCardClasses(isCompactViewport: boolean, density: "default" | "thin") {
  const roundedClass = isCompactViewport ? "rounded-2.5xl" : "rounded-3xl";
  const paddingClass = density === "thin" && isCompactViewport ? "p-4" : "p-5";

  return `${roundedClass} app-panel ${paddingClass}`;
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

export function FieldIconBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-surface-soft)] text-[var(--app-muted-strong)] shadow-sm ${className}`}>
      {children}
    </div>
  );
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
      className={`${getCardClasses(isCompactViewport, "thin")} w-full transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
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
      className={`app-panel flex w-full items-center justify-center border-2 border-dashed border-[var(--app-border)] transition-colors hover:border-[var(--app-border-strong)] disabled:cursor-not-allowed disabled:opacity-70 ${
        isCompactViewport ? "rounded-2.5xl p-4" : "rounded-3xl p-6"
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
  hideIcon?: boolean;
  tone?: "primary" | "warning";
}

interface SecondaryButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: (() => void) | undefined;
  disabled?: boolean;
  loading?: boolean;
  hideIcon?: boolean;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  icon,
  onClick,
  disabled = false,
  loading = false,
  hideIcon = false,
  tone = "primary",
}: PrimaryButtonProps) {
  return (
    <AppButton
      size="lg"
      fullWidth
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      variant={tone === "warning" ? "warning" : "primary"}
      trailingIcon={!disabled && !loading && !hideIcon ? icon ?? <ArrowRight className="h-4 w-4" /> : null}
    >
      <span>{children}</span>
    </AppButton>
  );
}

export function SecondaryButton({
  children,
  icon,
  onClick,
  disabled = false,
  loading = false,
  hideIcon = true,
  fullWidth = true,
}: SecondaryButtonProps) {
  return (
    <AppButton
      variant="secondary"
      size="lg"
      fullWidth={fullWidth}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      trailingIcon={!disabled && !loading && !hideIcon ? icon ?? <ArrowRight className="h-4 w-4" /> : null}
    >
      <span>{children}</span>
    </AppButton>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl — reusable pill toggle used across all steps
// ---------------------------------------------------------------------------

interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  icon: ReactNode;
}

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-zinc-200/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[var(--app-surface-soft)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${
            value === option.value
              ? "bg-amber-100 text-amber-950 shadow-sm shadow-amber-200/60 dark:bg-amber-400/20 dark:text-amber-200"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
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
      className="space-y-3 bg-[var(--app-surface)]"
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
