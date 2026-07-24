"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { Logo } from "../branding/Logo";
import { MenuTriggerButton } from "../layout/MenuTriggerButton";
import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";
import { SiteMenuPanel } from "../layout/SiteMenuPanel";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { MarketingBody, MarketingHeading } from "./typography";

export function Header() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      role="banner"
      data-theme-chrome="marketing"
      className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-bg)]/95 backdrop-blur transition-colors"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2.5 transition-colors"
        >
          <Logo iconClassName="h-7 w-7" wordmarkClassName="truncate text-xl" />
        </Link>

        <MarketingBody
          as="nav"
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-sm md:flex"
        >
          <Link
            href="/pricing"
            className="text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)]"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/help"
            className="text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)]"
          >
            {t("nav.help")}
          </Link>
        </MarketingBody>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <HeaderLanguageMenu />
          </div>
          <Link href="/draft/new" className="btn-primary hidden px-4 py-2 md:inline-flex">
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
                <SheetTitle>
                  <MarketingHeading
                    as="span"
                    className="text-base font-semibold tracking-tight"
                  >
                    {tc("appName")}
                  </MarketingHeading>
                </SheetTitle>
                <SheetDescription className="mt-1">
                  <MarketingBody as="span" tone="muted" className="text-sm">
                    {t("nav.writeLetter")}
                  </MarketingBody>
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
