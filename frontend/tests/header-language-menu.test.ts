// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("useCase=lease-cancellation"),
}));

vi.mock("../src/i18n/navigation", () => ({
  usePathname: () => "/draft/example",
  useRouter: () => ({ replace: replaceSpy }),
}));

vi.mock("../src/i18n/routing", () => ({
  routing: { locales: ["de-CH", "fr-CH", "it-CH", "en-CH"] },
}));

import { HeaderLanguageMenu } from "../src/components/layout/HeaderLanguageMenu";

describe("header language menu", () => {
  beforeEach(() => {
    replaceSpy.mockReset();
    window.history.replaceState(
      {},
      "",
      "/draft/example?useCase=lease-cancellation#assistant",
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes the active locale in the compact trigger name", () => {
    render(React.createElement(HeaderLanguageMenu));

    const trigger = screen.getByRole("button", { name: "Language, Deutsch" });

    expect(trigger.textContent ?? "").toContain("DE");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("shows readable locale names and preserves route state during locale changes", async () => {
    const user = userEvent.setup();

    render(React.createElement(HeaderLanguageMenu));

    const trigger = screen.getByRole("button", { name: "Language, Deutsch" });
    await user.click(trigger);

    const menu = await screen.findByRole("menu");
    const options = within(menu).getAllByRole("menuitemradio");
    const optionText = options.map(
      (option) => option.textContent?.replace(/\s+/g, " ").trim() ?? "",
    );

    expect(optionText).toEqual([
      expect.stringContaining("Deutsch"),
      expect.stringContaining("Français"),
      expect.stringContaining("Italiano"),
      expect.stringContaining("English"),
    ]);
    expect(options[0].getAttribute("aria-checked")).toBe("true");
    expect(
      options.slice(1).every((option) => option.getAttribute("aria-checked") === "false"),
    ).toBe(true);

    await user.click(options[1]);

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith(
      "/draft/example?useCase=lease-cancellation#assistant",
      { locale: "fr-CH" },
    );
  });
});
