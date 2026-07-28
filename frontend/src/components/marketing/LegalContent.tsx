import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LEGAL_PAGE_STACK_CLASS_NAME } from "../layout/page-spacing";
import { MarketingBody, MarketingHeading, MarketingMeta } from "./typography";

/**
 * The one thing a legal page may set apart from the running text.
 *
 * A left rule in the action yellow rather than a filled box: on a page whose
 * job is to be read and believed, a coloured panel reads as marketing. The rule
 * is the only accent, and everything inside keeps the body's left edge one step
 * in, so the callout still lines up with the sections below it.
 */
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
      className={`border-l-2 border-amber-400/80 pl-4 dark:border-amber-500/50 sm:pl-5 ${className}`}
    >
      {title ? (
        <MarketingHeading as="h2" className="text-base font-semibold">
          {title}
        </MarketingHeading>
      ) : null}
      <MarketingBody
        as="div"
        className={`space-y-3 text-sm leading-relaxed ${title ? "mt-3" : ""}`}
      >
        {children}
      </MarketingBody>
    </section>
  );
}

/**
 * One numbered clause of a legal page.
 *
 * A hairline rule above the heading, not a card around it: the ledger rules are
 * this app's separator everywhere else, and a page of stacked rounded panels
 * reads like a product tour rather than a contract. Body text sits flush with
 * its heading — the only indentation on these pages is a list marker, so a
 * reader can tell a list from a paragraph at a glance.
 */
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
    <section className={`hairline border-t pt-6 sm:pt-8 ${className}`}>
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
  // Markers, deliberately: an indented block with no marker is indistinguishable
  // from an indented paragraph, which is how the same page ended up looking like
  // it had two different indentation rules.
  return (
    <MarketingBody
      as="ul"
      className="list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-zinc-400 dark:marker:text-zinc-500"
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

/**
 * One link style for every legal page, so an internal cross-reference, an
 * outside authority and a support address all look like the same promise.
 */
const LEGAL_LINK_CLASS_NAME =
  "font-medium text-amber-700 underline underline-offset-4 dark:text-amber-300";

export function LegalExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LEGAL_LINK_CLASS_NAME}>
      {children}
    </a>
  );
}

/** A cross-reference to another page of ours — routed, so the locale is kept. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={LEGAL_LINK_CLASS_NAME}>
      {children}
    </Link>
  );
}

export function LegalMailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className={LEGAL_LINK_CLASS_NAME}>
      {email}
    </a>
  );
}

/** A postal address, kept on its own lines. */
export function LegalAddress({ lines }: { lines: readonly string[] }) {
  return <span className="whitespace-pre-line">{lines.join("\n")}</span>;
}

/**
 * The "last updated" line above a legal page's title. Every one of these pages
 * needs it and every one of them was styling it by hand.
 */
export function LegalEyebrow({ children }: { children: ReactNode }) {
  return (
    <MarketingMeta as="p" className="text-[11px] font-semibold tracking-normal">
      {children}
    </MarketingMeta>
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

/**
 * The "which language governs" note that opens every legal page. Set as an
 * aside — a hairline rule and muted text — so it reads as a footnote at the
 * top rather than as the page's first claim.
 */
export function LegalReferenceNotice({ children }: { children: ReactNode }) {
  return (
    <MarketingBody
      as="section"
      tone="muted"
      className="hairline border-l-2 pl-4 text-sm leading-relaxed sm:pl-5"
    >
      {children}
    </MarketingBody>
  );
}
