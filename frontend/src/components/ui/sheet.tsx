"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ScrollShadowViewport, type ScrollShadowSurface } from "./scroll-shadow";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type SheetSurfaceKind = "action" | "navigation" | "preview";

const SHEET_SURFACE_CLASS_NAMES: Record<SheetSurfaceKind, string> = {
  action:
    "min-h-0 flex flex-col overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-strong)] shadow-[var(--app-elevated-shadow)]",
  navigation:
    "flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none bg-[var(--app-surface-strong)] sm:max-w-sm sm:rounded-l-[28px]",
  preview:
    "min-h-0 flex flex-col overflow-hidden bg-[var(--app-surface-muted)] shadow-[var(--app-elevated-shadow)]",
};

function getSheetSurfaceClassName(kind: SheetSurfaceKind): string {
  return SHEET_SURFACE_CLASS_NAMES[kind];
}

function getSheetFooterClassName(options?: {
  sticky?: boolean | undefined;
  surface?: "default" | "muted" | undefined;
}): string {
  const sticky = options?.sticky ?? false;
  const surface = options?.surface ?? "default";

  return cx(
    "shrink-0 flex flex-col gap-3 border-t border-[var(--app-border)] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:px-6",
    sticky
      ? surface === "muted"
        ? "sticky bottom-0 bg-[var(--app-surface-muted)]/95 backdrop-blur"
        : "sticky bottom-0 bg-[var(--app-surface-strong)]/95 backdrop-blur"
      : undefined,
  );
}

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cx(
      "fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px] animate-preview-overlay-in motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left";
  }
>(({ className, side = "right", ...props }, ref) => {
  const sideClassName =
    side === "bottom"
      ? "inset-x-0 bottom-0 top-auto rounded-t-[28px]"
      : side === "top"
        ? "inset-x-0 top-0 rounded-b-[28px]"
        : side === "left"
          ? "inset-y-0 left-0 h-full w-3/4 max-w-md rounded-r-[28px]"
          : "inset-y-0 right-0 h-full w-3/4 max-w-md rounded-l-[28px]";

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cx(
          `sheet-panel-${side} fixed z-[201] outline-none motion-reduce:animate-none`,
          sideClassName,
          className,
        )}
        {...props}
      />
    </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={className} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={className} {...props} />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-1 px-4 pb-2 sm:px-5", className)} {...props} />;
}

function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  surface?: ScrollShadowSurface | undefined;
}) {
  const { surface = "default", ...restProps } = props;

  return (
    <ScrollShadowViewport
      surface={surface}
      className={className}
      {...restProps}
    />
  );
}

function SheetFooter({
  className,
  sticky = false,
  surface = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  sticky?: boolean | undefined;
  surface?: "default" | "muted" | undefined;
}) {
  return (
    <div className={cx(getSheetFooterClassName({ sticky, surface }), className)} {...props} />
  );
}

function SheetHandle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
      <div className={cx("flex justify-center", className)} {...props}>
      <div className="h-1 w-10 rounded-full bg-[var(--app-border-strong)]" aria-hidden="true" />
      </div>
  );
}

export {
  getSheetFooterClassName,
  getSheetSurfaceClassName,
  SheetBody,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
