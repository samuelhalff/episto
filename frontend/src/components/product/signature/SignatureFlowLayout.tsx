"use client";

import type { ReactNode } from "react";
import { FlowHeader } from "@/components/product/FlowHeader";
import {
  APP_PAGE_STACK_CLASS_NAME,
  NARROW_APP_PAGE_SHELL_CLASS_NAME,
} from "@/components/layout/page-spacing";

interface SignatureFlowLayoutProps {
  draftId: string;
  title: string;
  eyebrow?: string;
  description: string;
  badge?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function SignatureFlowLayout({
  draftId,
  title,
  eyebrow,
  description,
  badge,
  footer,
  children,
}: SignatureFlowLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader currentStep={3} draftId={draftId} title={title} />

      <main
        id="main-content"
        className={[
          NARROW_APP_PAGE_SHELL_CLASS_NAME,
          APP_PAGE_STACK_CLASS_NAME,
          "pb-12 pt-8",
        ].join(" ")}
      >
        <section className="app-panel rounded-[2rem] p-6 sm:p-7">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
              {title}
            </h1>
            {badge}
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {description}
          </p>

          <div className="mt-6 space-y-4">{children}</div>
        </section>

        {footer ? <div className="pt-2">{footer}</div> : null}
      </main>
    </div>
  );
}
