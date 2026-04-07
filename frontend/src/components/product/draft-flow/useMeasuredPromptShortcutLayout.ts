"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PromptShortcutItem } from "./PromptShortcutSheet";
import {
  resolvePromptShortcutLayout,
  type PromptShortcutLayoutResult,
} from "./prompt-shortcut-layout";

interface UseMeasuredPromptShortcutLayoutOptions<TShortcut extends PromptShortcutItem> {
  primaryShortcuts: readonly TShortcut[];
  overflowShortcuts: readonly TShortcut[];
  hasLeadingSlot?: boolean | undefined;
  gap?: number | undefined;
}

export function useMeasuredPromptShortcutLayout<TShortcut extends PromptShortcutItem>({
  primaryShortcuts,
  overflowShortcuts,
  hasLeadingSlot = false,
  gap = 8,
}: UseMeasuredPromptShortcutLayoutOptions<TShortcut>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  const shortcutRefs = useRef(new Map<string, HTMLSpanElement>());
  const [availableWidth, setAvailableWidth] = useState(0);
  const [shortcutWidths, setShortcutWidths] = useState<Map<string, number>>(new Map());
  const [moreWidth, setMoreWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const measure = () => {
      const computedStyle = window.getComputedStyle(container);
      const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;

      setAvailableWidth(Math.max(0, container.clientWidth - paddingLeft - paddingRight));
      setMoreWidth(moreRef.current?.offsetWidth ?? 0);
      setShortcutWidths(
        new Map(
          primaryShortcuts.map((shortcut) => [
            shortcut.id,
            shortcutRefs.current.get(shortcut.id)?.offsetWidth ?? 0,
          ]),
        ),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (moreRef.current) {
      observer.observe(moreRef.current);
    }
    shortcutRefs.current.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [overflowShortcuts.length, primaryShortcuts]);

  const needsMoreChip = overflowShortcuts.length > 0 || primaryShortcuts.length > 1;
  const hasMeasuredShortcuts = primaryShortcuts.every(
    (shortcut) => (shortcutWidths.get(shortcut.id) ?? 0) > 0,
  );
  const hasMeasurements =
    availableWidth > 0 &&
    hasMeasuredShortcuts &&
    (!needsMoreChip || moreWidth > 0);

  const layout: PromptShortcutLayoutResult<TShortcut> = useMemo(() => {
    if (!hasMeasurements) {
      const shouldCollapseToMore = overflowShortcuts.length > 0 || primaryShortcuts.length > 1;

      return {
        visiblePrimaryShortcuts: shouldCollapseToMore ? [] : [...primaryShortcuts],
        sheetShortcuts: shouldCollapseToMore
          ? [...primaryShortcuts, ...overflowShortcuts]
          : [...overflowShortcuts],
      };
    }

    return resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts,
      availableWidth,
      shortcutWidths,
      moreWidth,
      hasLeadingSlot,
      gap,
    });
  }, [
    availableWidth,
    gap,
    hasMeasurements,
    hasLeadingSlot,
    moreWidth,
    overflowShortcuts,
    primaryShortcuts,
    shortcutWidths,
  ]);

  return {
    containerRef,
    moreRef,
    shortcutRefs,
    hasMeasurements,
    layout,
  };
}
