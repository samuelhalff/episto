import { useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-6xl font-bold text-gray-900">404</h1>
        <p className="mb-6 text-lg text-gray-600">
          {t("pageNotFound")}
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
