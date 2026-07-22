"use client";

import type { ReactNode } from "react";
import { openFeedback } from "./AppFeedbackLauncher";

/** A plain button that opens the app-wide feedback dialog. */
export function FeedbackTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={openFeedback} className={className}>
      {children}
    </button>
  );
}
