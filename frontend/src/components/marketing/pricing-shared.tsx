"use client";

import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cx } from "./primitives";
import { MarketingBody, MarketingMeta } from "./typography";

export function SyncDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-4 dark:bg-zinc-950/30">
      <MarketingMeta
        as="dt"
        tone="muted"
        className="text-xs font-semibold tracking-normal"
      >
        {label}
      </MarketingMeta>
      <MarketingBody as="dd" tone="emphasis" className="mt-2 text-sm font-medium">
        {value}
      </MarketingBody>
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
      <span className={cx("min-w-0", labelClassName)}>
        <MarketingBody as="span" tone="soft" className="text-sm leading-6">
          {label}
        </MarketingBody>
      </span>
      <span className={cx("shrink-0 text-right", valueClassName)}>
        <MarketingBody as="span" tone="emphasis" className="text-sm font-semibold">
          {value}
        </MarketingBody>
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
      <MarketingBody as="span" tone="strong" className="text-sm leading-6">
        {children}
      </MarketingBody>
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
