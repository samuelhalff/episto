import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";

export function Footer() {
  const t = useTranslations("marketing");

  return (
    <footer
      role="contentinfo"
      className="border-t border-stone-200/70 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe2_100%)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        {/* Links */}
        <nav aria-label="Footer navigation" className="flex gap-6 text-sm text-stone-500">
          <Link href="/help" className="transition-colors hover:text-stone-950">
            {t("footer.help")}
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-stone-950">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="transition-colors hover:text-stone-950">
            {t("footer.terms")}
          </Link>
          <Link href="/imprint" className="transition-colors hover:text-stone-950">
            {t("footer.imprint")}
          </Link>
        </nav>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Copyright */}
        <p className="text-sm text-stone-400">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
