import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { cx } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";
import {
  LEGAL_PAGE_ARTICLE_CLASS_NAME,
  LEGAL_PAGE_HEADER_CLASS_NAME,
  LEGAL_PAGE_MAIN_CLASS_NAME,
} from "../layout/page-spacing";

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" className={LEGAL_PAGE_MAIN_CLASS_NAME}>
        <article className={LEGAL_PAGE_ARTICLE_CLASS_NAME}>{children}</article>
      </main>
      <Footer />
    </>
  );
}

export function LegalPageHeader({
  title,
  description,
  eyebrow,
  notice,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  notice?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx(LEGAL_PAGE_HEADER_CLASS_NAME, className)}>
      {notice}
      <div className="space-y-3 sm:space-y-4">
        {eyebrow}
        <MarketingHeading
          as="h1"
          className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl"
        >
          {title}
        </MarketingHeading>
        {description ? (
          <MarketingBody tone="soft" className="max-w-2xl text-base leading-relaxed">
            {description}
          </MarketingBody>
        ) : null}
      </div>
    </header>
  );
}
