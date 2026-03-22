"use client";

import { useEffect, useState } from "react";

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      return;
    }
    const currentViewport: VisualViewport = visualViewport;

    function onResize() {
      setViewportHeight(currentViewport.height);
    }

    onResize();
    currentViewport.addEventListener("resize", onResize);

    return () => currentViewport.removeEventListener("resize", onResize);
  }, []);

  return viewportHeight;
}
