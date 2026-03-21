"use client";

import { AlertTriangle, Check, Circle, XCircle } from "lucide-react";
import { Link } from "../../i18n/navigation.js";

type ChecklistTone = "complete" | "warning" | "optional" | "missing";

/**
 * Single checklist row showing completion status for a review field.
 */
export function ChecklistItem({
  label,
  tone,
  helperText,
  href,
  actionLabel,
}: {
  label: string;
  tone: ChecklistTone;
  helperText?: string | undefined;
  href?: string | undefined;
  actionLabel?: string | undefined;
}) {
  const styles = {
    complete: {
      icon: <Check className="h-3.5 w-3.5" />,
      iconClassName: "bg-success/10 text-success",
      labelClassName: "text-gray-700",
      helperClassName: "text-gray-500",
    },
    warning: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      iconClassName: "bg-amber-100 text-amber-700",
      labelClassName: "text-amber-900",
      helperClassName: "text-amber-800/80",
    },
    optional: {
      icon: <Circle className="h-3.5 w-3.5" />,
      iconClassName: "bg-gray-100 text-gray-400",
      labelClassName: "text-gray-600",
      helperClassName: "text-gray-500",
    },
    missing: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      iconClassName: "bg-red-100 text-red-700",
      labelClassName: "text-red-900",
      helperClassName: "text-red-800/80",
    },
  } as const;

  const style = styles[tone];

  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.iconClassName}`}
        >
          {style.icon}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${style.labelClassName}`}>{label}</p>
          {helperText ? (
            <p className={`mt-1 text-xs ${style.helperClassName}`}>{helperText}</p>
          ) : null}
        </div>
      </div>

      {href && actionLabel ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </li>
  );
}
