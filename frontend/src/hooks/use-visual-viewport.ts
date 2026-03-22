"use client";

import { useEffect, useRef, useState } from "react";

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setViewportHeight(vv!.height);
      });
    }

    // Set initial value
    setViewportHeight(vv.height);
    vv.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      vv.removeEventListener("resize", onResize);
    };
  }, []);

  return viewportHeight;
}
