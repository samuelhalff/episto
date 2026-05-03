"use client";

import {
  createElement,
  useCallback,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "episto-theme";

interface ThemeContextValue {
  theme: Theme;
  hasResolvedTheme: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
type ThemeSnapshot = Pick<ThemeContextValue, "theme" | "hasResolvedTheme">;

const SERVER_THEME_SNAPSHOT = {
  theme: "light",
  hasResolvedTheme: false,
} satisfies ThemeSnapshot;
const themeListeners = new Set<() => void>();
let cachedThemeSnapshot: ThemeSnapshot = SERVER_THEME_SNAPSHOT;

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getAppliedDocumentTheme(): Theme | null {
  if (typeof document === "undefined") {
    return null;
  }

  const appliedTheme = document.documentElement.dataset.theme;
  return appliedTheme === "light" || appliedTheme === "dark" ? appliedTheme : null;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readThemeSnapshot(): ThemeSnapshot {
  return {
    theme: getAppliedDocumentTheme() ?? getPreferredTheme(),
    hasResolvedTheme: document.documentElement.dataset.themeReady === "true",
  };
}

function getThemeSnapshot() {
  if (typeof document === "undefined") {
    return SERVER_THEME_SNAPSHOT;
  }

  const nextSnapshot = readThemeSnapshot();
  if (
    cachedThemeSnapshot.theme !== nextSnapshot.theme ||
    cachedThemeSnapshot.hasResolvedTheme !== nextSnapshot.hasResolvedTheme
  ) {
    cachedThemeSnapshot = nextSnapshot;
  }

  return cachedThemeSnapshot;
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, hasResolvedTheme } = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => SERVER_THEME_SNAPSHOT,
  );

  useLayoutEffect(() => {
    const nextTheme = getAppliedDocumentTheme() ?? getPreferredTheme();
    applyTheme(nextTheme);
    document.documentElement.dataset.themeReady = "true";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    notifyThemeListeners();
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    document.documentElement.dataset.themeReady = "true";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    notifyThemeListeners();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      hasResolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [hasResolvedTheme, setTheme, theme, toggleTheme],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
