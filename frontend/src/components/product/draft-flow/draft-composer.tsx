"use client";

import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { ArrowUp, Layers, Mic, Paperclip, Square } from "lucide-react";

interface DraftComposerProps {
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
  onSend?: () => void;
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
  topBadges,
  leadingActions,
  trailingActions,
  helperText,
  onFocus,
  onBlur,
  isCompactViewport = false,
}: DraftComposerProps) {
  const canSend = Boolean(value?.trim());
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
    textarea.style.overflowY = textarea.scrollHeight > maxComposerHeight ? "auto" : "hidden";
  }, [maxComposerHeight, value]);

  function handleSend() {
    if (!canSend) return;
    onSend?.();
  }

  return (
    <div
      className={`bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 ${
        isCompactViewport ? "rounded-[24px] p-2" : "rounded-[28px] p-2"
      }`}
    >
      <div className="flex flex-col">
        {topBadges ? <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1">{topBadges}</div> : null}

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
          className={`w-full rounded-[22px] bg-zinc-50 px-5 pb-5 pt-4 text-[16px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 resize-none focus:outline-none dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
            isCompactViewport ? "min-h-[92px]" : "min-h-[100px]"
          }`}
        />

        {helperText ? (
          <div className="px-3 pt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {helperText}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-1">{leadingActions}</div>

          <div className="flex items-center gap-2">
            {trailingActions}
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={handleSend}
              disabled={!canSend}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                canSend
                  ? "scale-105 bg-zinc-950 text-white shadow-lg dark:bg-amber-400 dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600"
              }`}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
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

export function StepTriggerButton({
  isOpen = false,
  size = "dock",
  className = "",
  type = "button",
  ...props
}: StepTriggerButtonProps) {
  const sizeClass =
    size === "composer"
      ? "h-10 w-10 rounded-full"
      : "h-[58px] w-[58px] rounded-[20px]";
  const stateClass = isOpen
    ? "bg-zinc-950 text-white ring-zinc-950 dark:bg-amber-400 dark:text-zinc-950 dark:ring-amber-400"
    : size === "composer"
      ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      : "bg-white text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-white/10 dark:hover:bg-zinc-800";

  return (
    <button
      type={type}
      className={`flex shrink-0 items-center justify-center shadow-sm ring-1 ring-black/5 transition-all active:scale-95 ${sizeClass} ${stateClass} ${className}`}
      {...props}
    >
      <Layers className={`transition-transform ${size === "composer" ? "h-[18px] w-[18px]" : "h-6 w-6"} ${isOpen ? "rotate-90" : ""}`} />
    </button>
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
      className={`inline-flex min-h-8 items-center rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface ComposerIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: "attach" | "dictate" | "stop";
  tone?: "neutral" | "accent";
  isActive?: boolean;
}

export function ComposerIconButton({
  icon,
  tone = "neutral",
  isActive = false,
  className = "",
  type = "button",
  ...props
}: ComposerIconButtonProps) {
  const Icon = icon === "attach" ? Paperclip : icon === "stop" ? Square : Mic;
  const toneClass =
    tone === "accent"
      ? isActive
        ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
        : "bg-amber-100 text-amber-600 hover:bg-amber-200"
      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

  return (
    <button
      type={type}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 ${toneClass} ${className}`}
      {...props}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
