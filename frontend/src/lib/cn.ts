import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and de-duplicate conflicting Tailwind
 * utilities (shadcn convention). Used by the shadcn-style components added for
 * the admin analytics dashboard.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
