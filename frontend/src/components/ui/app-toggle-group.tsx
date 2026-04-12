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
  className?: string;
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
  const selectedIndex = selectedOption
    ? options.findIndex((option) => option.value === selectedOption.value)
    : -1;
  const selectedValue = selectedOption?.value ?? "";

  if (variant === "theme") {
    return (
      <div
        className={cx(
          "group app-list-item inline-flex items-center gap-3 rounded-full backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--app-fg)]",
          compact ? "px-3 py-2" : "px-3.5 py-2.5",
          className,
        )}
      >
        <span className="app-field-surface relative inline-flex h-8 w-14 items-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] transition-colors dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <span
            className={cx(
              "pointer-events-none absolute left-1 z-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm transition-all duration-300",
              selectedOption
                ? selectedIndex > 0
                  ? "translate-x-6 opacity-100"
                  : "translate-x-0 opacity-100"
                : "translate-x-0 opacity-0",
            )}
          >
            {selectedOption?.icon}
          </span>
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
            className="relative z-10 grid h-full w-full grid-cols-2 px-1"
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
                    "flex h-full items-center justify-center rounded-full text-[var(--app-muted)]",
                    "focus-visible:ring-2 focus-visible:ring-amber-400",
                    isSelected
                      ? "text-[var(--action-primary-fg)]"
                      : "hover:text-[var(--app-fg)]",
                  )}
                >
                  {option.icon}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </span>
        <span className="min-w-[3.5rem] text-sm font-semibold">
          {selectedOption?.label ?? ""}
        </span>
      </div>
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
        "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1 text-[var(--app-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
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
              "inline-flex min-w-[6rem] items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "ring-offset-[var(--app-surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--action-choice-active-border)] focus-visible:ring-offset-2",
              option.icon ? "gap-2" : "",
              isSelected
                ? "bg-[var(--action-choice-active-bg)] text-[var(--action-choice-active-fg)] shadow-sm outline outline-1 outline-[var(--action-choice-active-border)]"
                : "bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-surface-strong)]/80 hover:text-[var(--app-fg)]",
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
