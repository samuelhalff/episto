"use client";

import React, { type ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export interface AppToggleGroupOption<V extends string = string> {
  value: V;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

interface AppToggleGroupProps<V extends string> {
  ariaLabel: string;
  options: readonly AppToggleGroupOption<V>[];
  value?: V | null | undefined;
  onChange: (value: V) => void;
  variant?: "segmented" | "theme";
  className?: string | undefined;
  compact?: boolean | undefined;
  disabled?: boolean | undefined;
}

export function AppToggleGroup<V extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  variant = "segmented",
  className,
  compact = false,
  disabled = false,
}: AppToggleGroupProps<V>) {
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const selectedValue = selectedOption?.value ?? "";

  if (variant === "theme") {
    return (
      <ToggleGroup
        type="single"
        value={selectedValue}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onChange(nextValue as V);
          }
        }}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cx(
          "inline-flex min-w-0 max-w-full items-stretch rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          compact
            ? "shrink-0 gap-1 p-1"
            : "app-list-item w-full gap-1.5 p-1.5 transition-all duration-300 hover:-translate-y-0.5",
          className,
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.ariaLabel ?? option.label}
              title={option.ariaLabel ?? option.label}
              className={cx(
                "inline-flex min-w-0 flex-1 items-center justify-center rounded-full font-semibold transition-all",
                "ring-offset-[var(--app-surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--action-choice-active-border)] focus-visible:ring-offset-2",
                compact
                  ? "min-h-10 min-w-[5rem] gap-1.5 px-3 text-xs whitespace-nowrap"
                  : "min-h-11 gap-2.5 px-4 py-2.5 text-sm",
                isSelected
                  ? "bg-[var(--action-choice-active-bg)] text-[var(--action-choice-active-fg)] shadow-sm outline outline-1 outline-[var(--action-choice-active-border)]"
                  : "bg-transparent text-[var(--app-muted-strong)] hover:bg-[var(--app-surface-strong)]/80 hover:text-[var(--app-fg)]",
              )}
            >
              {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
              <span className={compact ? "whitespace-nowrap" : "min-w-0 truncate"}>
                {option.label}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    );
  }

  return (
    <ToggleGroup
      type="single"
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as V);
        }
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(
        "inline-flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1 text-[var(--app-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel ?? option.label}
            className={cx(
              "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              "ring-offset-[var(--app-surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--action-choice-active-border)] focus-visible:ring-offset-2",
              option.icon ? "gap-2" : "",
              isSelected
                ? "bg-[var(--action-choice-active-bg)] text-[var(--action-choice-active-fg)] shadow-sm outline outline-1 outline-[var(--action-choice-active-border)]"
                : "bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-surface-strong)]/80 hover:text-[var(--app-fg)]",
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
