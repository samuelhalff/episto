import { LockKeyhole, Mailbox, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingIconToken } from "./MarketingIconToken";
import { MarketingBody } from "./typography";

const trustItems = [
  { key: "postal", Icon: Mailbox },
  { key: "privacy", Icon: ShieldCheck },
  { key: "encryption", Icon: LockKeyhole },
  { key: "noAccount", Icon: UserRound },
] as const;

export function TrustStrip() {
  const t = useTranslations("marketing");

  return (
    <section className="mt-10 border-y border-[var(--app-border)] bg-[var(--app-surface-muted)]/75 px-4 py-5 mb-6 sm:mt-12 sm:px-6 sm:mb-8">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 lg:gap-6">
        {trustItems.map(({ key, Icon }) => {
          return (
            <div
              key={key}
              className="flex w-full items-center gap-3 rounded-full border border-[var(--app-border)] bg-white/80 px-4 py-2 text-left shadow-sm dark:bg-zinc-950/50 sm:w-auto"
            >
              <MarketingIconToken className="h-9 w-9 [&>svg]:size-4" tone="amber">
                <Icon />
              </MarketingIconToken>
              <MarketingBody as="span" className="min-w-0 flex-1 text-sm leading-5">
                {t(`homepage.trustStrip.${key}`)}
              </MarketingBody>
            </div>
          );
        })}
      </div>
    </section>
  );
}
