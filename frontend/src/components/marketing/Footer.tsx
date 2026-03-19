import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";

export function Footer() {
  const t = useTranslations("marketing");

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        {/* Links */}
        <nav className="flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-navy">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-navy">
            {t("footer.terms")}
          </Link>
          <Link href="/imprint" className="hover:text-navy">
            {t("footer.imprint")}
          </Link>
        </nav>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Copyright */}
        <p className="text-sm text-gray-400">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
