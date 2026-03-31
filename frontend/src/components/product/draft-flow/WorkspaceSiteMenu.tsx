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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";

interface WorkspaceSiteMenuProps {
  isCompactViewport?: boolean | undefined;
}

export function WorkspaceSiteMenu({ isCompactViewport = false }: WorkspaceSiteMenuProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      {isCompactViewport ? (
        <>
          <MenuTriggerButton
            aria-label={menuOpen ? tc("closeMenu") : tc("openMenu")}
            aria-expanded={menuOpen}
            isOpen={menuOpen}
            compact
            onClick={() => setMenuOpen((open) => !open)}
          />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent
              side="right"
              className={getSheetSurfaceClassName("navigation")}
              aria-label="Navigation menu"
            >
              <SheetHeader className="px-5 pb-5 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {tc("appName")}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {t("nav.writeLetter")}
                    </SheetDescription>
                  </div>
                  <MenuTriggerButton
                    aria-label={tc("closeMenu")}
                    isOpen
                    compact
                    onClick={() => setMenuOpen(false)}
                  />
                </div>
              </SheetHeader>
              <SheetBody className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
                <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
                  <SiteMenuPanel onNavigate={() => setMenuOpen(false)} />
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </>
      ) : (
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
      )}
    </div>
  );
}
