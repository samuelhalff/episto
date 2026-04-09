"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "./MenuTriggerButton";
import { SiteMenuPanel } from "./SiteMenuPanel";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
  const triggerSlotClassName = "flex h-11 w-11 shrink-0 items-start justify-end";

  if (!isCompactViewport) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <div className={triggerSlotClassName}>
          <PopoverTrigger asChild>
            <MenuTriggerButton
              compact
              isOpen={open}
              aria-label={open ? tc("closeMenu") : tc("openMenu")}
              aria-expanded={open}
            />
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-[360px] p-0" aria-label="Navigation menu">
          <div className="px-6 pb-4 pt-6">
            <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
          <div className="border-t border-zinc-200/80 px-6 pb-6 pt-5 dark:border-zinc-800">
            <SiteMenuPanel onNavigate={() => setOpen(false)} />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className={triggerSlotClassName}>
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
        <div className="px-6 pb-5 pt-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {title}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </SheetDescription>
            </div>
            <div className={triggerSlotClassName}>
              <SheetClose asChild>
                <MenuTriggerButton compact isOpen aria-label={tc("closeMenu")} />
              </SheetClose>
            </div>
          </div>
        </div>
        <SheetBody className="px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-8">
          <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
            <SiteMenuPanel onNavigate={() => setOpen(false)} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
