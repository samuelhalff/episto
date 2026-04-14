"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
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
  leadingVisual?: "back" | "hide" | "none";
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
      trailingIcon={
        !disabled && !loading && !hideIcon
          ? (icon ?? <ArrowRight className="h-4 w-4" />)
          : null
      }
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
  leadingVisual = "back",
}: SecondaryButtonProps) {
  const leadingIcon =
    leadingVisual === "none" ? null : leadingVisual === "hide" ? (
      <X className="h-4 w-4" />
    ) : (
      <ArrowLeft className="h-4 w-4" />
    );

  return (
    <AppButton
      variant="secondary"
      size="lg"
      fullWidth={fullWidth}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      leadingIcon={!disabled && !loading ? leadingIcon : null}
      trailingIcon={
        !disabled && !loading && !hideIcon
          ? (icon ?? <ArrowRight className="h-4 w-4" />)
          : null
      }
    >
      <span>{children}</span>
    </AppButton>
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
      {title ? (
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      ) : null}
      {description ? (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      ) : null}
      <div className="w-full sm:max-w-sm">
        <PrimaryButton onClick={onAction} disabled={disabled}>
          {actionLabel}
        </PrimaryButton>
      </div>
    </Card>
  );
}
