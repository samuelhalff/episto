"use client";

import * as React from "react";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type ScrollShadowSurface = "default" | "muted";

function getScrollShadowOverlayClassName(
  edge: "top" | "bottom",
  surface: ScrollShadowSurface,
): string {
  if (edge === "top") {
    return surface === "muted"
      ? "bg-gradient-to-b from-[var(--app-surface-muted)] via-[var(--app-surface-muted)]/94 to-transparent"
      : "bg-gradient-to-b from-[var(--app-surface-strong)] via-[var(--app-surface-strong)]/94 to-transparent";
  }

  return surface === "muted"
    ? "bg-gradient-to-t from-[var(--app-surface-muted)] via-[var(--app-surface-muted)]/96 to-transparent"
    : "bg-gradient-to-t from-[var(--app-surface-strong)] via-[var(--app-surface-strong)]/96 to-transparent";
}

function ScrollShadowViewport({
  className,
  wrapperClassName,
  surface = "default",
  flush = false,
  onScroll,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  wrapperClassName?: string | undefined;
  surface?: ScrollShadowSurface | undefined;
  flush?: boolean | undefined;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [{ showTopShadow, showBottomShadow }, setShadowState] = React.useState({
    showTopShadow: false,
    showBottomShadow: false,
  });

  const updateShadows = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
    const hasOverflow = maxScrollTop > 1;
    const nextState = {
      showTopShadow: hasOverflow && viewport.scrollTop > 2,
      showBottomShadow: hasOverflow && viewport.scrollTop < maxScrollTop - 2,
    };

    setShadowState((current) =>
      current.showTopShadow === nextState.showTopShadow &&
      current.showBottomShadow === nextState.showBottomShadow
        ? current
        : nextState,
    );
  }, []);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    let frameId = 0;
    const scheduleUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateShadows();
      });
    };

    scheduleUpdate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;
    resizeObserver?.observe(viewport);

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleUpdate)
        : null;
    mutationObserver?.observe(viewport, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateShadows]);

  return (
    <div className={cx("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", wrapperClassName)}>
      <div
        ref={viewportRef}
        className={cx(
          flush
            ? "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [webkit-overflow-scrolling:touch]"
            : "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-2 [scrollbar-gutter:stable] [webkit-overflow-scrolling:touch]",
          className,
        )}
        data-scroll-shadow-viewport="true"
        onScroll={(event) => {
          updateShadows();
          onScroll?.(event);
        }}
        {...props}
      >
        {children}
      </div>

      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-8 transition-opacity duration-200",
          getScrollShadowOverlayClassName("top", surface),
          showTopShadow ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 transition-opacity duration-200",
          getScrollShadowOverlayClassName("bottom", surface),
          showBottomShadow ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export {
  getScrollShadowOverlayClassName,
  ScrollShadowViewport,
  type ScrollShadowSurface,
};
