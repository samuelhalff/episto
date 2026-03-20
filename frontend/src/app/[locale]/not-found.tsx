import { useTranslations } from "next-intl";
import { Button } from "../../components/ui/button.js";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          {t("pageNotFound")}
        </p>
        <Button asChild>
          <Link href="/">
            {t("backToHome")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
