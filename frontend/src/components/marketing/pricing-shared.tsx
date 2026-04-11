"use client";

import type { ReactNode } from "react";
import { Check, CircleSlash } from "lucide-react";
import { cx } from "./primitives";

export function SyncDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-4 dark:bg-zinc-950/30">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">{value}</dd>
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

export function PricingRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="marketing-surface-muted flex items-start justify-between gap-4 rounded-2xl px-4 py-3">
      <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{label}</span>
      <span
        className={cx(
          "text-right text-sm font-semibold",
          highlight
            ? "text-amber-700 dark:text-amber-400"
            : "text-zinc-950 dark:text-zinc-50",
        )}
      >
        {price}
      </span>
    </div>
  );
}

export function ComparisonRow({
  feature,
  standard,
  registered,
  emphasizePrice = false,
}: {
  feature: ReactNode;
  standard: ReactNode;
  registered: ReactNode;
  emphasizePrice?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1.15fr_0.85fr_0.85fr] border-b border-zinc-200/80 last:border-b-0 dark:border-zinc-800">
      <div className="px-4 py-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {feature}
      </div>
      <div
        className={cx(
          "px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400",
          emphasizePrice && "font-semibold text-zinc-950 dark:text-zinc-50",
        )}
      >
        {standard}
      </div>
      <div
        className={cx(
          "px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400",
          emphasizePrice && "font-semibold text-amber-700 dark:text-amber-400",
        )}
      >
        {registered}
      </div>
    </div>
  );
}

export function IncludedItem({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface-muted flex items-start gap-3 rounded-2xl px-4 py-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{children}</span>
    </div>
  );
}

export function ExcludedItem({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface-muted flex items-start gap-3 rounded-2xl px-4 py-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <CircleSlash className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{children}</span>
    </div>
  );
}
