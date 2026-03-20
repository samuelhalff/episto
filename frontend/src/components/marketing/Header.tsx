"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { Menu, X } from "lucide-react";

export function Header() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header role="banner" className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight text-navy">
          {tc("appName")}
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <Link
            href="/how-it-works"
            className="text-sm text-gray-600 hover:text-navy"
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-gray-600 hover:text-navy"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/help"
            className="text-sm text-gray-600 hover:text-navy"
          >
            {t("nav.help")}
          </Link>
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/draft/new"
          className="hidden rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light md:inline-block"
        >
          {t("nav.writeLetter")}
        </Link>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => {
            setMenuOpen(!menuOpen);
          }}
          aria-label="Menu"
        >
          {menuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-gray-100 bg-white px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="/how-it-works"
              className="text-sm text-gray-600 hover:text-navy"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-gray-600 hover:text-navy"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/help"
              className="text-sm text-gray-600 hover:text-navy"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.help")}
            </Link>
            <Link
              href="/draft/new"
              className="inline-block rounded-md bg-navy px-4 py-2 text-center text-sm font-medium text-white hover:bg-navy-light"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.writeLetter")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
