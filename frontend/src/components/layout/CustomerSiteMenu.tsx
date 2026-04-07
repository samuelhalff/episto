"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "./MenuTriggerButton";
import { SiteMenuPanel } from "./SiteMenuPanel";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../ui/sheet";

interface CustomerSiteMenuProps {
  title: string;
  description: string;
  isCompactViewport?: boolean | undefined;
}

export function CustomerSiteMenu({
  title,
  description,
  isCompactViewport = false,
}: CustomerSiteMenuProps) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const headerPaddingClassName = isCompactViewport
    ? "px-6 pb-5 pt-5 sm:px-8"
    : "px-6 pb-5 pt-3 sm:px-8 lg:px-10";
  const bodyPaddingClassName = isCompactViewport
    ? "px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-8"
    : "px-6 pb-5 sm:px-8 lg:px-10";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex h-11 w-11 shrink-0 items-start justify-end">
        {!open ? (
          <MenuTriggerButton
            compact
            aria-label={tc("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          />
        ) : null}
      </div>
      <SheetContent
        side="right"
        className={getSheetSurfaceClassName("navigation")}
        aria-label="Navigation menu"
      >
        <div className={headerPaddingClassName}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {title}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </SheetDescription>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-start justify-end">
              <SheetClose asChild>
                <MenuTriggerButton compact isOpen aria-label={tc("closeMenu")} />
              </SheetClose>
            </div>
          </div>
        </div>
        <SheetBody className={bodyPaddingClassName}>
          <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
            <SiteMenuPanel onNavigate={() => setOpen(false)} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
