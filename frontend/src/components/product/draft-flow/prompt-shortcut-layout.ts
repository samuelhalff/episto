import type { PromptShortcutItem } from "./PromptShortcutSheet";

interface ResolvePromptShortcutLayoutOptions<TShortcut extends PromptShortcutItem> {
  primaryShortcuts: readonly TShortcut[];
  overflowShortcuts: readonly TShortcut[];
  availableWidth: number;
  shortcutWidths: ReadonlyMap<string, number>;
  moreWidth: number;
  hasLeadingSlot?: boolean | undefined;
  leadingWidth?: number | undefined;
  gap?: number | undefined;
}

export interface PromptShortcutLayoutResult<TShortcut extends PromptShortcutItem> {
  visiblePrimaryShortcuts: TShortcut[];
  sheetShortcuts: TShortcut[];
}

export function resolvePromptShortcutLayout<TShortcut extends PromptShortcutItem>({
  primaryShortcuts,
  overflowShortcuts,
  availableWidth,
  shortcutWidths,
  moreWidth,
  hasLeadingSlot = false,
  leadingWidth = 0,
  gap = 8,
}: ResolvePromptShortcutLayoutOptions<TShortcut>) {
  if (availableWidth <= 0) {
    return {
      visiblePrimaryShortcuts: [],
      sheetShortcuts: [...primaryShortcuts, ...overflowShortcuts],
    };
  }

  const visiblePrimaryShortcuts: TShortcut[] = [];
  const deferredPrimaryShortcuts: TShortcut[] = [];
  const hasLeadingContent = hasLeadingSlot || leadingWidth > 0;
  let usedWidth = leadingWidth;

  for (let index = 0; index < primaryShortcuts.length; index += 1) {
    const shortcut = primaryShortcuts[index];
    if (!shortcut) {
      continue;
    }

    const shortcutWidth = shortcutWidths.get(shortcut.id) ?? Number.POSITIVE_INFINITY;
    const willNeedMore =
      overflowShortcuts.length > 0 || index < primaryShortcuts.length - 1;
    const nextUsedWidth =
      usedWidth +
      (visiblePrimaryShortcuts.length > 0 || hasLeadingContent ? gap : 0) +
      shortcutWidth;
    const budget = availableWidth - (willNeedMore ? gap + moreWidth : 0);

    if (nextUsedWidth <= budget) {
      visiblePrimaryShortcuts.push(shortcut);
      usedWidth = nextUsedWidth;
      continue;
    }

    deferredPrimaryShortcuts.push(...primaryShortcuts.slice(index));
    break;
  }

  return {
    visiblePrimaryShortcuts,
    sheetShortcuts: [...deferredPrimaryShortcuts, ...overflowShortcuts],
  };
}
