import type { ReactNode } from "react";

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
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 marker:text-zinc-400 dark:text-zinc-300 dark:marker:text-zinc-500">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
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
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">{item.label}</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{item.value}</dd>
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
    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{children}</p>
  );
}

export function LegalInlineCode({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.92em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
      {children}
    </span>
  );
}

export function LegalDivider() {
  return <div className="h-px bg-zinc-200/80 dark:bg-zinc-800" />;
}

export function LegalPageStack({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function LegalReferenceNotice({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 sm:p-5">
      {children}
    </section>
  );
}
