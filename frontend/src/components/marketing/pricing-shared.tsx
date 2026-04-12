"use client";

import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cx } from "./primitives";

export function SyncDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-4 dark:bg-zinc-950/30">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

export function PriceAmount({
  loading,
  value,
  fallback,
}: {
  loading: boolean;
  value: string | undefined;
  fallback: string;
}) {
  if (loading) {
    return <span className="animate-shimmer inline-block h-4 w-20 rounded-full" />;
  }

  return <>{value ?? fallback}</>;
}

export function PricingValueRow({
  label,
  value,
  labelClassName,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
      <span
        className={cx(
          "min-w-0 text-sm leading-6 text-zinc-600 dark:text-zinc-400",
          labelClassName,
        )}
      >
        {label}
      </span>
      <span
        className={cx(
          "shrink-0 text-right text-sm font-semibold text-zinc-950 dark:text-zinc-50",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PricingListItem({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "success" | "danger";
}) {
  return (
    <div className="marketing-surface-muted flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3">
      <span
        className={cx(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          tone === "success"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
        )}
      >
        {icon}
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {children}
      </span>
    </div>
  );
}

export function IncludedItem({ children }: { children: ReactNode }) {
  return (
    <PricingListItem icon={<Check className="h-3.5 w-3.5" />} tone="success">
      {children}
    </PricingListItem>
  );
}

export function ExcludedItem({ children }: { children: ReactNode }) {
  return (
    <PricingListItem icon={<X className="h-3.5 w-3.5" />} tone="danger">
      {children}
    </PricingListItem>
  );
}
