"use client";

import { memo } from "react";

export interface ReviewSummaryItem {
  label: string;
  value: string | string[];
  helperText?: string | undefined;
  emptyLabel?: string | undefined;
}

interface ReviewSummaryCardProps {
  title: string;
  description: string;
  statusLabel: string;
  items: ReviewSummaryItem[];
}

export function ReviewSummaryCard({
  title,
  description,
  statusLabel,
  items,
}: ReviewSummaryCardProps) {
  return (
    <div className="app-panel rounded-3xl p-6">
      <div>
        <h2 className="text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-400">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        {statusLabel ? (
          <p className="mt-2 text-xs leading-5 text-zinc-400 dark:text-zinc-500">
            {statusLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <SummaryBlock key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}

const SummaryBlock = memo(function SummaryBlock({
  label,
  value,
  helperText,
  emptyLabel,
}: ReviewSummaryItem) {
  const values = Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  const hasValue = values.length > 0;

  return (
    <div className="app-list-item-muted rounded-2xl p-4">
      <p className="text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        {hasValue ? (
          values.map((line, index) => (
            <p
              key={`${label}-${index}`}
              className="text-sm leading-6 text-zinc-900 dark:text-zinc-100"
            >
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {emptyLabel ?? "—"}
          </p>
        )}
      </div>
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
