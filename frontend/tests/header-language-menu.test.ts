// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    window.history.replaceState({}, "", "/draft/example?useCase=lease-cancellation#assistant");
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes the active locale in the compact trigger name", () => {
    render(React.createElement(HeaderLanguageMenu));

    const trigger = screen.getByRole("button", { name: "Language, Deutsch" });

    expect(trigger.textContent ?? "").toContain("DE");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("shows readable locale names and preserves route state during keyboard locale changes", async () => {
    const user = userEvent.setup();

    render(React.createElement(HeaderLanguageMenu));

    const trigger = screen.getByRole("button", { name: "Language, Deutsch" });
    await user.click(trigger);

    const listbox = await screen.findByRole("listbox", { name: "Language" });
    const options = within(listbox).getAllByRole("option");
    const optionText = options.map((option) => option.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(optionText).toEqual([
      expect.stringContaining("Deutsch"),
      expect.stringContaining("Français"),
      expect.stringContaining("Italiano"),
      expect.stringContaining("English"),
    ]);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[0].getAttribute("tabindex")).toBe("0");
    expect(options.slice(1).every((option) => option.getAttribute("tabindex") === "-1")).toBe(
      true,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(options[0]);
    });

    await user.keyboard("{ArrowDown}");

    await waitFor(() => {
      expect(document.activeElement).toBe(options[1]);
    });

    expect(options[0].getAttribute("tabindex")).toBe("-1");
    expect(options[1].getAttribute("tabindex")).toBe("0");

    await user.keyboard("{End}");

    await waitFor(() => {
      expect(document.activeElement).toBe(options[3]);
    });

    await user.keyboard("{Home}");

    await waitFor(() => {
      expect(document.activeElement).toBe(options[0]);
    });

    await user.keyboard("{ArrowDown}");
    fireEvent.keyDown(options[1], { key: " " });

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith(
      "/draft/example?useCase=lease-cancellation#assistant",
      { locale: "fr-CH" },
    );
  });
});
