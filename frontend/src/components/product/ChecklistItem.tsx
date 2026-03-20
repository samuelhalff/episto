"use client";

import { Check, Circle } from "lucide-react";

/**
 * Single checklist row showing completion status for a review field.
 */
export function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      {complete ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Circle className="h-5 w-5 text-gray-300" />
      )}
      <span className={complete ? "text-gray-700" : "text-gray-400"}>
        {label}
      </span>
    </li>
  );
}
