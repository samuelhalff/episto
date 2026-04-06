"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "../../lib/theme";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const t = useTranslations("common");
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? t("switchToLight") : t("switchToDark")}
        title={isDark ? t("switchToLight") : t("switchToDark")}
        className={[
          "group app-list-item inline-flex items-center gap-3 rounded-full backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--app-fg)]",
          compact ? "px-3 py-2" : "px-3.5 py-2.5",
        ].join(" ")}
      >
        <span className="app-field-surface relative inline-flex h-8 w-14 items-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] transition-colors dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <span
            className={[
              "absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm transition-transform duration-300",
              isDark ? "translate-x-6" : "translate-x-0",
            ].join(" ")}
          >
            {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </span>
          <span className="flex w-full items-center justify-between px-1.5 text-[var(--app-muted)]">
            <Sun className="h-3.5 w-3.5" />
            <Moon className="h-3.5 w-3.5" />
          </span>
        </span>

      <span className="text-sm font-semibold">
        {isDark ? t("themeDark") : t("themeLight")}
      </span>
    </button>
  );
}
