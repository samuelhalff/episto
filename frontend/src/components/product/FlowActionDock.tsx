"use client";

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// FlowActionDock
// ---------------------------------------------------------------------------
// Shared sticky bottom bar used across review, checkout, and payment steps.
// Renders a fixed mobile dock that becomes static on large screens.
// ---------------------------------------------------------------------------

interface FlowActionDockProps {
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function FlowActionDock({
  primaryAction,
  secondaryAction,
  hint,
  className,
}: FlowActionDockProps) {
  return (
    <div
      className={[
        "app-sticky-bar fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4",
        "lg:static lg:mt-8 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:shadow-none lg:outline-none lg:backdrop-blur-none",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hint ? <div>{hint}</div> : null}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}
