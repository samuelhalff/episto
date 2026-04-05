"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface MenuTriggerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
  compact?: boolean;
  label?: string;
}

function MenuTriggerIcon({ isOpen }: { isOpen: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <span className="menu-trigger-icon" aria-hidden="true">
      <motion.span
        className="menu-trigger-line menu-trigger-line-top"
        animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
        transition={transition}
      />
      <motion.span
        className="menu-trigger-line menu-trigger-line-middle"
        animate={isOpen ? { opacity: 0, scaleX: 0.6 } : { opacity: 1, scaleX: 1 }}
        transition={transition}
      />
      <motion.span
        className="menu-trigger-line menu-trigger-line-bottom"
        animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
        transition={transition}
      />
    </span>
  );
}

export const MenuTriggerButton = forwardRef<HTMLButtonElement, MenuTriggerButtonProps>(
  ({ isOpen = false, compact = false, label, className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-state={isOpen ? "open" : "closed"}
      className={`menu-trigger-button inline-flex shrink-0 items-center justify-center gap-3 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${
        compact ? "h-11 w-11 rounded-full" : "h-12 rounded-2xl px-4"
      } ${className}`}
      {...props}
    >
      <MenuTriggerIcon isOpen={isOpen} />
      {!compact && label ? <span className="text-sm font-semibold">{label}</span> : null}
    </button>
  ),
);

MenuTriggerButton.displayName = "MenuTriggerButton";
