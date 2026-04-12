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
  value: V;
  onChange: (value: V) => void;
  variant?: "segmented" | "theme";
  className?: string;
  compact?: boolean | undefined;
}

export function AppToggleGroup<V extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  variant = "segmented",
  className,
  compact = false,
}: AppToggleGroupProps<V>) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = options.findIndex((option) => option.value === value);

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
              "pointer-events-none absolute left-1 z-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm transition-transform duration-300",
              selectedIndex > 0 ? "translate-x-6" : "translate-x-0",
            )}
          >
            {selectedOption?.icon}
          </span>
          <ToggleGroup
            type="single"
            value={value}
            onValueChange={(nextValue) => {
              if (nextValue) {
                onChange(nextValue as V);
              }
            }}
            aria-label={ariaLabel}
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
        <span className="text-sm font-semibold">{selectedOption?.label ?? ""}</span>
      </div>
    );
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as V);
        }
      }}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
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
              "app-choice-pill px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest",
              "focus-visible:ring-2 focus-visible:ring-amber-400",
              option.icon ? "gap-1.5" : "",
              isSelected
                ? "app-choice-pill-active shadow-sm"
                : "text-[var(--app-muted)] hover:text-[var(--app-fg)]",
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
