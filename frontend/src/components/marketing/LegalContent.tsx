import type { ReactNode } from "react";
import { LEGAL_PAGE_STACK_CLASS_NAME } from "../layout/page-spacing";
import { MarketingBody, MarketingHeading, MarketingMeta } from "./typography";

export function LegalCallout({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 transition-colors dark:border-amber-500/20 dark:bg-amber-500/5 sm:p-6 ${className}`}
    >
      {title ? (
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-950 dark:text-amber-100">
          {title}
        </h2>
      ) : null}
      <div className={title ? "mt-3" : undefined}>{children}</div>
    </section>
  );
}

export function LegalSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6 ${className}`}
    >
      <MarketingHeading as="h2" className="text-base font-semibold">
        {title}
      </MarketingHeading>
      <MarketingBody as="div" className="mt-3 space-y-3 text-sm leading-relaxed">
        {children}
      </MarketingBody>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <MarketingBody
      as="ul"
      className="space-y-2 pl-5 text-sm leading-relaxed marker:text-zinc-400 dark:marker:text-zinc-500"
    >
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </MarketingBody>
  );
}

export function LegalDefinitionList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="divide-y divide-zinc-200/70 text-sm dark:divide-zinc-800">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
        >
          <MarketingMeta as="dt" tone="muted" className="font-medium">
            {item.label}
          </MarketingMeta>
          <MarketingBody as="dd" tone="emphasis">
            {item.value}
          </MarketingBody>
        </div>
      ))}
    </dl>
  );
}

export function LegalExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {children}
    </a>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalMutedText({ children }: { children: ReactNode }) {
  return (
    <MarketingMeta tone="muted" className="text-xs leading-relaxed">
      {children}
    </MarketingMeta>
  );
}

export function LegalInlineCode({ children }: { children: ReactNode }) {
  return (
    <MarketingBody
      as="span"
      tone="emphasis"
      className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.92em] dark:bg-zinc-800"
    >
      {children}
    </MarketingBody>
  );
}

export function LegalDivider() {
  return <div className="h-px bg-zinc-200/80 dark:bg-zinc-800" />;
}

export function LegalPageStack({ children }: { children: ReactNode }) {
  return <div className={LEGAL_PAGE_STACK_CLASS_NAME}>{children}</div>;
}

export function LegalReferenceNotice({ children }: { children: ReactNode }) {
  return (
    <MarketingBody
      as="section"
      tone="label"
      className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5"
    >
      {children}
    </MarketingBody>
  );
}
