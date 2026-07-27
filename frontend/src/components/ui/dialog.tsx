"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cx(
      "overlay-surface fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px] motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cx(
        "fixed inset-0 z-[201] outline-none sheet-panel-bottom motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// The one modal standard for the app. The visible panel IS the Radix Content
// element (not a full-screen wrapper), so backdrop clicks and the
// onPointerDownOutside / onEscapeKeyDown dismissal-blocking handlers work as
// intended. Layout: a bottom-docked floating card on mobile, a centered card of
// a fixed max width on desktop. Animation is scoped per breakpoint in globals
// (slide up on mobile, fade on desktop) so it never clobbers the centering
// transform. Prefer this over hand-rolling DialogContent + an app-panel div.
const DIALOG_PANEL_SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
} as const;

interface DialogPanelProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Desktop max width. Mobile is always a full-width bottom-docked card. */
  size?: keyof typeof DIALOG_PANEL_SIZES;
}

const DialogPanel = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogPanelProps
>(({ size = "md", className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cx(
        "dialog-panel app-panel fixed z-[201] overflow-y-auto rounded-4xl p-6 shadow-prominent-warm outline-none dark:shadow-prominent",
        // Mobile: bottom-docked card with a 16px side gutter + safe-area bottom.
        // Max height subtracts the SAME safe-area-aware bottom gutter (plus a 1rem
        // top gutter) so a tall panel can't clip past the top on notched devices.
        "inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-1rem-max(1rem,env(safe-area-inset-bottom)))]",
        // Desktop: centered card of a fixed max width.
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-h-[calc(100dvh-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-7",
        DIALOG_PANEL_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogPanel.displayName = "DialogPanel";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={className} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={className} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPanel,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
