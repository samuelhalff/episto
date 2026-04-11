import { JSDOM } from "jsdom";
import React, { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "./assert-defined";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    (
      {
        switchToLight: "Switch to light",
        switchToDark: "Switch to dark",
        themeDark: "Dark",
        themeLight: "Light",
      } as const
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

function flattenLogCalls(calls: unknown[][]) {
  return calls
    .flatMap((call) =>
      call.map((value) => {
        if (typeof value === "string") {
          return value;
        }

        if (value instanceof Error) {
          return `${value.name}: ${value.message}`;
        }

        return String(value);
      }),
    )
    .join("\n");
}

describe("ThemeProvider hydration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hydrates without mismatches when the stored theme is dark", async () => {
    vi.stubGlobal("React", React);

    const serverMarkup = renderToString(
      React.createElement(ThemeProvider, null, React.createElement(ThemeToggle)),
    );

    expect(serverMarkup).toContain("Light");

    const dom = new JSDOM(`<div id="root">${serverMarkup}</div>`, {
      url: "https://swissmail.ch",
    });
    const matchMedia = createMatchMedia(true);
    Object.defineProperty(dom.window, "matchMedia", {
      value: matchMedia,
      configurable: true,
    });
    dom.window.localStorage.setItem("swiss-mail-theme", "dark");

    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
    vi.stubGlobal("Element", dom.window.Element);
    vi.stubGlobal("Node", dom.window.Node);
    vi.stubGlobal("Text", dom.window.Text);
    vi.stubGlobal("SVGElement", dom.window.SVGElement);
    vi.stubGlobal("MutationObserver", dom.window.MutationObserver);
    vi.stubGlobal("localStorage", dom.window.localStorage);
    vi.stubGlobal("matchMedia", matchMedia);
    vi.stubGlobal("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
    vi.stubGlobal(
      "requestAnimationFrame",
      dom.window.requestAnimationFrame?.bind(dom.window) ??
        ((callback: FrameRequestCallback) => setTimeout(() => callback(0), 0)),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      dom.window.cancelAnimationFrame?.bind(dom.window) ?? ((id: number) => clearTimeout(id)),
    );
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = dom.window.document.getElementById("root");

    expect(container).not.toBeNull();

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        assertDefined(container),
        React.createElement(ThemeProvider, null, React.createElement(ThemeToggle)),
      );
      await Promise.resolve();
    });

    const loggedOutput = `${flattenLogCalls(errorSpy.mock.calls)}\n${flattenLogCalls(warnSpy.mock.calls)}`;
    expect(loggedOutput).not.toMatch(/hydration|didn't match/i);
    expect(container?.textContent).toContain("Dark");
    expect(dom.window.document.documentElement.dataset.theme).toBe("dark");

    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  });
});
