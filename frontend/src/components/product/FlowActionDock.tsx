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
  className?: string;
  /** When true, keeps the dock sticky at the bottom of the viewport on desktop. */
  desktopSticky?: boolean | undefined;
}

export function FlowActionDock({
  primaryAction,
  secondaryAction,
  className,
  desktopSticky,
}: FlowActionDockProps) {
  return (
    <div
      className={[
        "app-sticky-bar fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4",
        desktopSticky
          ? "lg:sticky lg:bottom-0 lg:inset-x-auto lg:z-30 lg:mt-8 lg:pb-4"
          : "lg:static lg:mt-8 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:shadow-none lg:outline-none lg:backdrop-blur-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}
