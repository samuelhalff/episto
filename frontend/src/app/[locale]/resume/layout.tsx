import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "@/lib/marketing-seo";

export const metadata = NO_INDEX_METADATA;

export default function ResumeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
