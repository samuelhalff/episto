"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider } from "./admin-auth-context";
import { AdminShell } from "./admin-shell";

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
