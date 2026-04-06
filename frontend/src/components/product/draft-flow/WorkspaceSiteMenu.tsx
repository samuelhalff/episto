"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "../../layout/MenuTriggerButton";
import { SiteMenuPanel } from "../../layout/SiteMenuPanel";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../../ui/sheet";

interface WorkspaceSiteMenuProps {
  isCompactViewport?: boolean | undefined;
}

export function WorkspaceSiteMenu({ isCompactViewport = false }: WorkspaceSiteMenuProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerPaddingClassName = isCompactViewport
    ? "px-6 pb-5 pt-5 sm:px-8"
    : "px-6 pb-5 pt-3 sm:px-8 lg:px-10";
  const titleRowClassName = "flex items-start justify-between gap-4";
  const triggerSlotClassName = "flex h-11 w-11 shrink-0 items-start justify-end";
  const bodyPaddingClassName = isCompactViewport
    ? "px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-8"
    : "px-6 pb-5 sm:px-8 lg:px-10";

  if (isCompactViewport) {
    return (
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <div className={triggerSlotClassName}>
          {!menuOpen ? (
            <MenuTriggerButton
              aria-label={tc("openMenu")}
              aria-expanded={menuOpen}
              compact
              onClick={() => setMenuOpen(true)}
            />
          ) : null}
        </div>
        <SheetContent
          side="right"
          className={getSheetSurfaceClassName("navigation")}
          aria-label="Navigation menu"
        >
          <div className={headerPaddingClassName}>
            <div className={titleRowClassName}>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {tc("appName")}
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("nav.writeLetter")}
                </SheetDescription>
              </div>
              <div className={triggerSlotClassName}>
                <SheetClose asChild>
                  <MenuTriggerButton aria-label={tc("closeMenu")} isOpen compact />
                </SheetClose>
              </div>
            </div>
          </div>
          <SheetBody className={bodyPaddingClassName}>
            <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
              <SiteMenuPanel onNavigate={() => setMenuOpen(false)} />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="relative">
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <MenuTriggerButton
            aria-label={menuOpen ? tc("closeMenu") : tc("openMenu")}
            aria-expanded={menuOpen}
            isOpen={menuOpen}
            label={menuOpen ? tc("closeMenu") : tc("openMenu")}
          />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-5">
          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {tc("appName")}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{t("nav.writeLetter")}</div>
            </div>
            <SiteMenuPanel onNavigate={() => setMenuOpen(false)} navAriaLabel="Workspace navigation" />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
