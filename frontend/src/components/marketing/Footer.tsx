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
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[0_18px_50px_rgba(120,53,15,0.08)] md:flex-row md:items-center md:justify-between">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-500"
          >
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

          <LanguageSwitcher />
        </div>

        <p className="text-center text-sm text-stone-400 md:text-left">
          {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
