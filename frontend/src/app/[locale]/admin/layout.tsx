import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "@/lib/marketing-seo";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = NO_INDEX_METADATA;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
