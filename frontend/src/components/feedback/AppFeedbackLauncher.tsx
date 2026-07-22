"use client";

import { useEffect, useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";

/**
 * A single, app-wide feedback dialog opened via a lightweight window event.
 * Triggers (footer link, in-app menu) just call {@link openFeedback}; this
 * launcher — mounted once near the app root — owns the dialog. That keeps the
 * modal out of any popover/sheet subtree that would unmount it on close.
 */
export const FEEDBACK_EVENT = "episto:open-feedback";

export function openFeedback(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FEEDBACK_EVENT));
  }
}

export function AppFeedbackLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(FEEDBACK_EVENT, handler);
    return () => window.removeEventListener(FEEDBACK_EVENT, handler);
  }, []);

  return <FeedbackDialog open={open} onOpenChange={setOpen} />;
}
