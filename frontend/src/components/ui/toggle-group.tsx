"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cx(
      "inline-flex min-w-0 items-center rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40",
      className,
    )}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cx(
      "inline-flex min-h-10 min-w-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 outline-none transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=on]:bg-zinc-950 data-[state=on]:text-white dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-700 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-950",
      className,
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
