import type { PromptShortcutItem } from "./PromptShortcutSheet";

interface ResolvePromptShortcutLayoutOptions<TShortcut extends PromptShortcutItem> {
  primaryShortcuts: readonly TShortcut[];
  overflowShortcuts: readonly TShortcut[];
  isCompactViewport?: boolean | undefined;
  compactPrimaryCount?: number | undefined;
}

export function resolvePromptShortcutLayout<TShortcut extends PromptShortcutItem>({
  primaryShortcuts,
  overflowShortcuts,
  isCompactViewport = false,
  compactPrimaryCount = primaryShortcuts.length,
}: ResolvePromptShortcutLayoutOptions<TShortcut>) {
  if (!isCompactViewport) {
    return {
      visiblePrimaryShortcuts: [...primaryShortcuts],
      sheetShortcuts: [...overflowShortcuts],
    };
  }

  const safeCompactPrimaryCount = Math.max(0, compactPrimaryCount);

  return {
    visiblePrimaryShortcuts: primaryShortcuts.slice(0, safeCompactPrimaryCount),
    sheetShortcuts: [
      ...primaryShortcuts.slice(safeCompactPrimaryCount),
      ...overflowShortcuts,
    ],
  };
}
