import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ResumeDraftPrompt } from "../product/ResumeDraftPrompt";

export function MarketingLayout({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className={mainClassName}>
        {children}
      </main>
      <Footer />
      <ResumeDraftPrompt />
    </>
  );
}
