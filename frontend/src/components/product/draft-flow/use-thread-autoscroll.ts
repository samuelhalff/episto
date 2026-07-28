"use client";

import { useEffect, useRef, type RefObject } from "react";
import { getScrollableAncestor } from "./scrollable-ancestor";

/**
 * Keep the conversation pinned to its latest message.
 *
 * The thread grows while the model streams, and the layout settles a frame or
 * two after the DOM does, so a single scroll lands short. This retries across
 * two animation frames and once more after the transition, and jumps without
 * animation the first time so the user does not watch the page scroll itself.
 */
export function useThreadAutoscroll(
  threadEndRef: RefObject<HTMLDivElement | null>,
  isActive: boolean,
  deps: readonly unknown[],
): void {
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      hasAutoScrolledRef.current = false;
      return;
    }

    if (!threadEndRef.current) return;

    const behavior = hasAutoScrolledRef.current ? "smooth" : "auto";
    let cancelled = false;

    const scrollThreadToBottom = () => {
      if (cancelled || !threadEndRef.current) return;

      threadEndRef.current.scrollIntoView({ block: "end", behavior });

      const scrollContainer = getScrollableAncestor(threadEndRef.current);
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior });
      }

      hasAutoScrolledRef.current = true;
    };

    const frameId = window.requestAnimationFrame(() => {
      scrollThreadToBottom();
      window.requestAnimationFrame(() => {
        scrollThreadToBottom();
      });
    });

    const timeoutId = window.setTimeout(() => {
      scrollThreadToBottom();
    }, 120);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadEndRef, isActive, ...deps]);
}
