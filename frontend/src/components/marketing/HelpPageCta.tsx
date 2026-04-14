import { MarketingActionLink, MarketingCard } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

export function HelpPageCta({
  eyebrow,
  title,
  body,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
}) {
  return (
    <MarketingCard className="rounded-[2rem] p-6 sm:p-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
        <div>
          <MarketingBody
            as="p"
            tone="muted"
            className="text-[11px] font-semibold uppercase tracking-[0.24em]"
          >
            {eyebrow}
          </MarketingBody>
          <MarketingHeading
            as="h2"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
          >
            {title}
          </MarketingHeading>
          <MarketingBody className="mt-3 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
            {body}
          </MarketingBody>
        </div>
        <div className="mt-6 lg:mt-0 lg:justify-self-end">
          <MarketingActionLink
            href="/draft/new"
            className="cta-sheen w-full lg:w-auto lg:px-8"
          >
            {actionLabel}
          </MarketingActionLink>
        </div>
      </div>
    </MarketingCard>
  );
}
