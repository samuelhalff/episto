"use client";

import { toast } from "sonner";

function getDescription(items?: readonly string[], description?: string): string | undefined {
  if (description) {
    return description;
  }

  return items && items.length > 0 ? items.join(" • ") : undefined;
}

export function showStepWarningToast(options: {
  id: string;
  title: string;
  items?: readonly string[];
  description?: string;
}) {
  toast.warning(options.title, {
    id: options.id,
    duration: 4500,
    description: getDescription(options.items, options.description),
  });
}

export function showStepErrorToast(options: {
  id: string;
  title: string;
  description?: string;
}) {
  toast.error(options.title, {
    id: options.id,
    duration: 5000,
    description: options.description,
  });
}
