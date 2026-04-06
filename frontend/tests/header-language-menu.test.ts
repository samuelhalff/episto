import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const headerLanguageMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/HeaderLanguageMenu.tsx"),
  "utf8",
);

describe("header language menu", () => {
  it("uses a compact popover trigger instead of the pill-strip selector", () => {
    expect(headerLanguageMenuSource).toContain('import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";');
    expect(headerLanguageMenuSource).toContain('aria-haspopup="listbox"');
    expect(headerLanguageMenuSource).toContain("routing.locales.map");
    expect(headerLanguageMenuSource).not.toContain("app-choice-pill");
  });

  it("renders a listbox with role option and aria-selected", () => {
    expect(headerLanguageMenuSource).toContain('role="listbox"');
    expect(headerLanguageMenuSource).toContain('role="option"');
    expect(headerLanguageMenuSource).toContain('aria-selected={isActive}');
    expect(headerLanguageMenuSource).not.toContain('<Link');
  });

  it("renders and interacts as a true listbox", () => {
    // Mock next-intl and routing
    vi.mock("next-intl", () => ({
      useLocale: () => "de-CH",
      useTranslations: () => (key: string) => (key === "language" ? "Language" : key),
    }));
    vi.mock("../../frontend/src/i18n/routing", () => ({
      routing: { locales: ["de-CH", "fr-CH", "it-CH"] },
    }));
    const push = vi.fn();
    const replace = vi.fn();
    vi.mock("../../frontend/src/i18n/navigation", () => ({
      usePathname: () => "/foo/bar",
      useRouter: () => ({ push, replace }),
    }));
    // Dynamically import after mocks
    // Import as ESM
    import("../../frontend/src/components/layout/HeaderLanguageMenu.tsx").then(({ HeaderLanguageMenu }) => {
      render(React.createElement(HeaderLanguageMenu));
      // Open the popover
      const trigger = screen.getByRole("button", { name: /language/i });
      fireEvent.click(trigger);
      // Listbox and options
      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
      // Focus and select
      options[1].focus();
      fireEvent.keyDown(listbox, { key: "ArrowDown" }); // should move focus to it-CH
      fireEvent.keyDown(listbox, { key: "End" }); // should move focus to last
      fireEvent.keyDown(listbox, { key: "Home" }); // should move focus to first
      fireEvent.keyDown(listbox, { key: "Enter" }); // should select de-CH (already active)
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      fireEvent.keyDown(listbox, { key: "Enter" }); // should select fr-CH
      expect(replace).toHaveBeenCalledWith("/foo/bar", { locale: "fr-CH" });
    });
  });
});