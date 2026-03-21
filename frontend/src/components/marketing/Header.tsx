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
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-stone-200/80 bg-[rgba(255,255,255,0.97)] shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-stone-950 sm:text-xl"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-white/90 text-sm shadow-[0_12px_30px_rgba(120,53,15,0.12)]">
            SM
          </span>
          <span className="truncate">{tc("appName")}</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-2 rounded-full border border-stone-200/80 bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] md:flex"
        >
          <Link
            href="/how-it-works"
            className="rounded-full px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-full px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/help"
            className="rounded-full px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
          >
            {t("nav.help")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/draft/new"
            className="cta-sheen hidden rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(28,25,23,0.22)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-stone-800 md:inline-block"
          >
            {t("nav.writeLetter")}
          </Link>

          <button
            type="button"
            className="rounded-full border border-stone-200/80 bg-white p-2 text-stone-700 shadow-sm md:hidden"
            onClick={() => {
              setMenuOpen(!menuOpen);
            }}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-stone-200/70 bg-[rgba(255,255,255,0.98)] px-4 pb-5 pt-4 sm:px-6 md:hidden"
        >
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-stone-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <Link
              href="/how-it-works"
              className="rounded-2xl px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/help"
              className="rounded-2xl px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-amber-50 hover:text-stone-950"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              {t("nav.help")}
            </Link>
            <Link
              href="/draft/new"
              className="cta-sheen mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(28,25,23,0.2)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-stone-800"
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
