"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppToggleGroup } from "../ui/app-toggle-group";
import { useTheme } from "../../lib/theme";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const t = useTranslations("common");
  const { hasResolvedTheme, setTheme, theme } = useTheme();
  const options = [
    {
      value: "light" as const,
      label: t("themeLight"),
      icon: <Sun className="h-3.5 w-3.5" />,
      ariaLabel: t("themeLight"),
    },
    {
      value: "dark" as const,
      label: t("themeDark"),
      icon: <Moon className="h-3.5 w-3.5" />,
      ariaLabel: t("themeDark"),
    },
  ];

  return (
    <AppToggleGroup
      ariaLabel={t("theme")}
      options={options}
      variant="theme"
      value={hasResolvedTheme ? theme : undefined}
      onChange={setTheme}
      compact={compact}
      disabled={!hasResolvedTheme}
    />
  );
}
