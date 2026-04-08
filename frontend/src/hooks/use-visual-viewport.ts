"use client";

import { useSyncExternalStore } from "react";

function getVisualViewportSnapshot(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.visualViewport?.height ?? null;
}

function subscribeToVisualViewport(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const visualViewport = window.visualViewport;
  if (!visualViewport) {
    return () => {};
  }

  let frameId = 0;
  const handleResize = () => {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      onStoreChange();
    });
  };

  visualViewport.addEventListener("resize", handleResize);
  return () => {
    cancelAnimationFrame(frameId);
    visualViewport.removeEventListener("resize", handleResize);
  };
}

export function useVisualViewport() {
  return useSyncExternalStore(
    subscribeToVisualViewport,
    getVisualViewportSnapshot,
    () => null,
  );
}
