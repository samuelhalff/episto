"use client";

import React, {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { ArrowUp, Eye, EyeOff, Layers, Mic, Paperclip, Square } from "lucide-react";
import { AppButton } from "../../ui/app-button";

interface DraftComposerProps {
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
  onSend?: () => void;
  isSending?: boolean;
  topBadges?: ReactNode;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
  helperText?: string | undefined;
  onFocus?: () => void;
  onBlur?: () => void;
  isCompactViewport?: boolean | undefined;
}

export function DraftComposer({
  placeholder,
  value = "",
  onChange,
  onSend,
  isSending = false,
  topBadges,
  leadingActions,
  trailingActions,
  helperText,
  onFocus,
  onBlur,
  isCompactViewport = false,
}: DraftComposerProps) {
  const canSend = Boolean(value?.trim()) && !isSending;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxComposerHeight = isCompactViewport ? 180 : 220;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, maxComposerHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxComposerHeight ? "auto" : "hidden";
  }, [maxComposerHeight, value]);

  function handleSend() {
    if (!canSend) return;
    onSend?.();
  }

  return (
    <div
      className={`app-panel-muted relative z-10 w-full max-w-full overflow-visible ${
        isCompactViewport ? "rounded-3xl p-2" : "rounded-4xl p-2"
      }`}
    >
      <div className="flex min-w-0 flex-col">
        {topBadges ? (
          <div className="mb-2 min-w-0 overflow-visible pt-1">{topBadges}</div>
        ) : null}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              handleSend();
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={1}
          className={`app-field-surface app-form-control w-full max-w-full resize-none rounded-3xl px-5 pb-5 pt-4 leading-relaxed placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-[var(--app-muted)] ${
            isCompactViewport ? "min-h-[92px]" : "min-h-[100px]"
          }`}
        />

        {helperText ? (
          <div className="px-3 pt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {helperText}
          </div>
        ) : null}

        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 px-2 pb-1">
          <div className="flex min-w-0 items-center gap-1">{leadingActions}</div>

          <div className="flex shrink-0 items-center gap-2">
            {trailingActions}
            <AppButton
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={handleSend}
              loading={isSending}
              disabled={!canSend && !isSending}
              variant={canSend || isSending ? "primary" : "secondary"}
              size="icon"
              className={canSend ? "scale-105" : "shadow-none"}
              leadingIcon={!isSending ? <ArrowUp className="h-5 w-5" /> : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepTriggerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean | undefined;
  size?: "dock" | "composer";
}

interface SurfaceIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isActive?: boolean;
  size?: "dock" | "composer";
}

export function SurfaceIconButton({
  children,
  isActive = false,
  size = "dock",
  className = "",
  type = "button",
  ...props
}: SurfaceIconButtonProps) {
  const sizeClass =
    size === "composer" ? "h-10 w-10 rounded-full" : "h-14 w-14 rounded-2xl";
  const stateClass = isActive
    ? "border-transparent bg-zinc-950 text-white shadow-sm dark:bg-amber-400 dark:text-zinc-950"
    : size === "composer"
      ? "border border-transparent bg-[var(--app-surface-soft)] text-[var(--app-muted)] hover:bg-[var(--app-surface)]"
      : "border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-fg)]";

  return (
    <button
      type={type}
      className={`relative z-10 flex shrink-0 items-center justify-center shadow-sm transition-all active:scale-95 ${sizeClass} ${stateClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function StepTriggerButton({
  isOpen = false,
  size = "dock",
  className = "",
  type = "button",
  ...props
}: StepTriggerButtonProps) {
  return (
    <SurfaceIconButton
      type={type}
      isActive={isOpen}
      size={size}
      className={className}
      {...props}
    >
      <Layers
        className={`transition-transform ${size === "composer" ? "h-[18px] w-[18px]" : "h-5 w-5"} ${isOpen ? "rotate-90" : ""}`}
      />
    </SurfaceIconButton>
  );
}

interface ComposerBadgeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ComposerBadge({
  children,
  className = "",
  type = "button",
  ...props
}: ComposerBadgeProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-8 items-center rounded-full bg-[var(--app-surface-soft)] px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-[var(--app-surface)] dark:text-[var(--app-muted-strong)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface ComposerIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: "attach" | "dictate" | "stop" | "preview" | "preview-off";
  tone?: "neutral" | "accent";
  isActive?: boolean;
  badgeCount?: number;
  pulse?: boolean;
}

export function ComposerIconButton({
  icon,
  tone = "neutral",
  isActive = false,
  badgeCount = 0,
  pulse = false,
  className = "",
  type = "button",
  ...props
}: ComposerIconButtonProps) {
  const Icon =
    icon === "attach"
      ? Paperclip
      : icon === "stop"
        ? Square
        : icon === "preview"
          ? Eye
          : icon === "preview-off"
            ? EyeOff
            : Mic;
  const toneClass =
    tone === "accent"
      ? isActive
        ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
        : "bg-amber-100 text-amber-600 hover:bg-amber-200"
      : "bg-[var(--app-surface-soft)] text-[var(--app-muted)] hover:bg-[var(--app-surface)] dark:text-[var(--app-muted-strong)]";

  return (
    <button
      type={type}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:bg-[var(--app-surface-soft)] disabled:text-[var(--app-muted)] ${toneClass} ${className}`}
      {...props}
    >
      {pulse ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-amber-500/40 motion-safe:animate-ping"
          aria-hidden
        />
      ) : null}
      <Icon className="relative h-5 w-5" />
      {badgeCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </button>
  );
}
