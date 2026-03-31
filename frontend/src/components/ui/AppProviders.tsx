"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "../../lib/query-client";
import { ThemeProvider } from "../../lib/theme";
import { AppToaster } from "./AppToaster";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AppToaster />
        {children}
      </QueryProvider>
    </ThemeProvider>
  );
}
