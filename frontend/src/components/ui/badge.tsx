import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Shadcn-style Badge (CVA variants) for payment/dispatch state chips on the
 * admin dashboard. Tones map onto the existing admin surface tokens.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--app-surface-muted)] text-[var(--app-muted)]",
        success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "bg-red-500/10 text-red-600 dark:text-red-400",
        info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
