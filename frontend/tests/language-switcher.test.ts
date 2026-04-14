// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replaceSpy } = vi.hoisted(() => ({
  replaceSpy: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "de-CH",
  useTranslations: () => (key: string) => (key === "language" ? "Language" : key),
}));

vi.mock("../src/i18n/navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) =>
    React.createElement("a", props, children),
  usePathname: () => "/pricing",
  useRouter: () => ({ replace: replaceSpy }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("section=faq"),
}));

vi.mock("../src/i18n/routing", () => ({
  routing: { locales: ["de-CH", "fr-CH", "it-CH", "en-CH"] },
}));

import { LanguageSwitcher } from "../src/components/marketing/LanguageSwitcher";

describe("language switcher", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/pricing?section=faq#footer");
  });

  afterEach(() => {
    cleanup();
    replaceSpy.mockReset();
  });

  it("preserves route state when switching locale through the shared language toggle", async () => {
    const user = userEvent.setup();

    render(React.createElement(LanguageSwitcher));

    expect(screen.getByRole("radio", { name: "DE" }).getAttribute("aria-checked")).toBe(
      "true",
    );

    await user.click(screen.getByRole("radio", { name: "FR" }));

    expect(replaceSpy).toHaveBeenCalledWith("/pricing?section=faq#footer", {
      locale: "fr-CH",
    });
  });

  it("preserves route state when switching locale through the compact menu variant", async () => {
    const user = userEvent.setup();

    render(React.createElement(LanguageSwitcher, { variant: "menu" }));

    await user.click(screen.getByRole("button", { name: "Language, Deutsch" }));

    expect(await screen.findByRole("menu")).toBeTruthy();

    await user.click(screen.getByRole("menuitemradio", { name: /Français/i }));

    expect(replaceSpy).toHaveBeenCalledWith("/pricing?section=faq#footer", {
      locale: "fr-CH",
    });
  });
});
