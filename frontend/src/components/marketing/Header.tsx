"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { Menu, X, Mail } from "lucide-react";
import { Button } from "../ui/button.js";
import { ThemeToggle } from "../ui/theme-toggle.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { cn } from "../../lib/utils.js";

export function Header() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {tc("appName")}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          <Link
            href="/how-it-works"
            className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/help"
            className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t("nav.help")}
          </Link>
        </nav>

        {/* Desktop right section */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/draft/new">
              {t("nav.writeLetter")}
            </Link>
          </Button>
        </div>

        {/* Mobile: theme toggle + menu */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/50 bg-background transition-all duration-200 md:hidden",
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"
        )}
      >
        <nav aria-label="Mobile navigation" className="flex flex-col gap-1 px-6 py-4">
          <Link
            href="/how-it-works"
            className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/help"
            className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.help")}
          </Link>
          <div className="my-2 h-px bg-border" />
          <div className="flex items-center justify-between px-3">
            <LanguageSwitcher />
          </div>
          <div className="mt-2 px-3">
            <Button asChild className="w-full" size="sm">
              <Link href="/draft/new" onClick={() => setMenuOpen(false)}>
                {t("nav.writeLetter")}
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
