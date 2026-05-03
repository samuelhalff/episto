// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    (
      ({
        switchToLight: "Switch to light",
        switchToDark: "Switch to dark",
        themeDark: "Dark",
        themeLight: "Light",
        theme: "Theme",
      }) as const
    )[key] ?? key,
}));

import { ThemeToggle } from "../src/components/marketing/ThemeToggle";
import { ThemeProvider } from "../src/lib/theme";

function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("theme toggle runtime", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", createMatchMedia(false));
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-ready");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lets the user choose dark mode directly", async () => {
    const user = userEvent.setup();

    render(React.createElement(ThemeProvider, null, React.createElement(ThemeToggle)));

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("episto-theme")).toBe("dark");
  });
});
