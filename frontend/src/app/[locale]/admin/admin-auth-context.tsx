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

interface AdminAuthState {
  ready: boolean;
  authenticated: boolean;
  microsoftSsoEnabled: boolean;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [microsoftSsoEnabled, setMicrosoftSsoEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchAdminAuthSession()
      .then((session) => {
        if (cancelled) return;
        setMicrosoftSsoEnabled(session.microsoftSsoEnabled);
        setAuthenticated(session.authenticated);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(false);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setAuthenticated(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, authenticated, microsoftSsoEnabled, logout }}
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
