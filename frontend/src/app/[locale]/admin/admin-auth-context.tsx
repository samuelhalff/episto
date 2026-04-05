"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AdminAuthState {
  authenticated: boolean;
  authHeader: string;
  login: (header: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authHeader, setAuthHeader] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("admin_auth") ?? "";
  });

  const authenticated = authHeader.length > 0;

  const login = useCallback((header: string) => {
    sessionStorage.setItem("admin_auth", header);
    setAuthHeader(header);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("admin_auth");
    setAuthHeader("");
  }, []);

  return (
    <AdminAuthContext.Provider value={{ authenticated, authHeader, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
