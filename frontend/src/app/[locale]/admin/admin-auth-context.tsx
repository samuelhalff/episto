"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  resolveAdminAuthHeader,
  shouldPersistAdminAuthHeader,
} from "./admin-auth-client";
import { adminLogout, fetchAdminAuthSession } from "./admin-api";

interface AdminAuthState {
  ready: boolean;
  authenticated: boolean;
  authHeader: string;
  microsoftSsoEnabled: boolean;
  login: (header: string) => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authHeader, setAuthHeader] = useState("");
  const [microsoftSsoEnabled, setMicrosoftSsoEnabled] = useState(false);

  useEffect(() => {
    const storedHeader = sessionStorage.getItem("admin_auth") ?? "";
    if (storedHeader.length > 0) {
      setAuthHeader(storedHeader);
      setReady(true);
    }

    let cancelled = false;

    void fetchAdminAuthSession()
      .then((session) => {
        if (cancelled) return;

        setMicrosoftSsoEnabled(session.microsoftSsoEnabled);

        if (storedHeader.length === 0) {
          setAuthHeader(resolveAdminAuthHeader("", session));
          setReady(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (storedHeader.length === 0) {
          setAuthHeader("");
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const authenticated = authHeader.length > 0;

  const login = useCallback((header: string) => {
    if (shouldPersistAdminAuthHeader(header)) {
      sessionStorage.setItem("admin_auth", header);
    } else {
      sessionStorage.removeItem("admin_auth");
    }
    setAuthHeader(header);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    sessionStorage.removeItem("admin_auth");
    setAuthHeader("");
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, authenticated, authHeader, microsoftSsoEnabled, login, logout }}
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
