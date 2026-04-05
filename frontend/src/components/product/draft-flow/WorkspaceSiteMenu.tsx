"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "../../layout/MenuTriggerButton";
import { SiteMenuPanel } from "../../layout/SiteMenuPanel";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
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

  return (
    <div className="relative">
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
          {/* Plain div instead of SheetHeader to avoid default px-4 conflict */}
          <div className="flex flex-col gap-1 px-6 pb-5 pt-5 sm:px-8 lg:px-10">
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
          </div>
          <SheetBody className={`px-6 sm:px-8 lg:px-10 ${isCompactViewport ? "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]" : "pb-5"}`}>
            <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
              <SiteMenuPanel onNavigate={() => setMenuOpen(false)} />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
