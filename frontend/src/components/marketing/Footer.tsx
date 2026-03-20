import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { Mail } from "lucide-react";
import { Separator } from "../ui/separator.js";

export function Footer() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <footer role="contentinfo" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">{tc("appName")}</span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("footer.tagline", { defaultValue: "Send formal letters via Swiss Post — quickly, securely, professionally." })}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/help" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("footer.help")}
            </Link>
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("footer.terms")}
            </Link>
            <Link href="/imprint" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("footer.imprint")}
            </Link>
          </nav>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
