"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "../../layout/MenuTriggerButton";
import { SiteMenuPanel } from "../../layout/SiteMenuPanel";
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
  const bodyPaddingClassName = isCompactViewport
    ? "px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-8"
    : "px-6 pb-5 sm:px-8 lg:px-10";
  const triggerSlotClassName = "flex h-11 w-11 shrink-0 items-start justify-end";
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <div className={triggerSlotClassName}>
        {!menuOpen ? (
          <MenuTriggerButton
            compact
            aria-label={tc("openMenu")}
            aria-expanded={menuOpen}
            onClick={openMenu}
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
                {tc("appName")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("nav.writeLetter")}
              </SheetDescription>
            </div>
            <div className={triggerSlotClassName}>
              <SheetClose asChild>
                <MenuTriggerButton compact isOpen aria-label={tc("closeMenu")} />
              </SheetClose>
            </div>
          </div>
        </div>
        <SheetBody className={bodyPaddingClassName}>
          <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
            <SiteMenuPanel onNavigate={closeMenu} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
