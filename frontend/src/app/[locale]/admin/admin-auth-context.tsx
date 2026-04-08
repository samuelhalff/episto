"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { adminLogout, fetchAdminAuthSession } from "./admin-api";
import type { AdminSessionStatus } from "./admin-auth-client";

interface AdminAuthState {
  ready: boolean;
  authenticated: boolean;
  microsoftSsoEnabled: boolean;
  admin?: AdminSessionStatus["admin"];
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [microsoftSsoEnabled, setMicrosoftSsoEnabled] = useState(false);
  const [admin, setAdmin] = useState<AdminSessionStatus["admin"]>();

  useEffect(() => {
    let cancelled = false;

    void fetchAdminAuthSession()
      .then((session) => {
        if (cancelled) return;
        setMicrosoftSsoEnabled(session.microsoftSsoEnabled);
        setAuthenticated(session.authenticated);
        setAdmin(session.admin);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(false);
        setAdmin(undefined);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setAuthenticated(false);
    setAdmin(undefined);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, authenticated, microsoftSsoEnabled, admin, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
