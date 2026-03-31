"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { MenuTriggerButton } from "../layout/MenuTriggerButton";
import { SiteMenuPanel } from "../layout/SiteMenuPanel";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

export function Header() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 bg-white/97 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-xl transition-colors dark:bg-zinc-950/92 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-zinc-950 transition-colors dark:text-zinc-50 sm:text-xl"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white shadow-sm dark:bg-amber-400 dark:text-zinc-950">
              SM
            </span>
            <span className="truncate">{tc("appName")}</span>
        </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm transition-colors md:flex dark:bg-zinc-900/90"
            style={{ outline: "1px solid var(--app-border)" }}
          >
            <Link
              href="/pricing"
              className="rounded-xl px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/help"
              className="rounded-xl px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {t("nav.help")}
            </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle compact />
          </div>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <Link
            href="/draft/new"
            className="hidden rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98] dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300 md:inline-block"
          >
            {t("nav.writeLetter")}
          </Link>

          <MenuTriggerButton
            compact
            isOpen={menuOpen}
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? tc("closeMenu") : tc("openMenu")}
            aria-expanded={menuOpen}
          />
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="right"
          className={`md:hidden ${getSheetSurfaceClassName("navigation")}`}
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
                compact
                isOpen
                onClick={() => setMenuOpen(false)}
                aria-label={tc("closeMenu")}
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
    </header>
  );
}
