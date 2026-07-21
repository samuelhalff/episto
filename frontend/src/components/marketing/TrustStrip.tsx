import { useTranslations } from "next-intl";
import { MarketingBody } from "./typography";

const trustKeys = ["postal", "privacy", "encryption", "noAccount"] as const;

export function TrustStrip() {
  const t = useTranslations("marketing");

  return (
    <section className="hairline border-y bg-[var(--app-surface-muted)]/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:px-6">
        {trustKeys.map((key) => (
          <div key={key} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--action-primary-bg)]"
            />
            <MarketingBody as="span" className="text-sm">
              {t(`homepage.trustStrip.${key}`)}
            </MarketingBody>
          </div>
        ))}
      </div>
    </section>
  );
}
