import { LockKeyhole, Mailbox, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingIconToken } from "./MarketingIconToken";

const trustItems = [
  { key: "postal", Icon: Mailbox },
  { key: "privacy", Icon: ShieldCheck },
  { key: "encryption", Icon: LockKeyhole },
  { key: "noAccount", Icon: UserRound },
] as const;

export function TrustStrip() {
  const t = useTranslations("marketing");

  return (
    <section className="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)]/75 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6">
        {trustItems.map(({ key, Icon }) => {
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-white/80 px-4 py-2 text-sm text-zinc-600 shadow-sm dark:bg-zinc-950/50 dark:text-zinc-300"
            >
              <MarketingIconToken className="h-9 w-9 [&>svg]:size-4" tone="accent">
                <Icon />
              </MarketingIconToken>
              <span>{t(`homepage.trustStrip.${key}`)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
