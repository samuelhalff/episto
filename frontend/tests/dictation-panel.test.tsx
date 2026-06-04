// @vitest-environment jsdom

import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import enMessages from "../src/messages/en-CH.json";

globalThis.React = React;

vi.mock("next-intl", () => {
  const getNested = (source: unknown, keyPath: string) =>
    keyPath.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[segment];
    }, source);

  const format = (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) =>
      String(values?.[key] ?? `{${key}}`),
    );

  return {
    useTranslations(namespace?: string) {
      return (key: string, values?: Record<string, unknown>) => {
        const base = namespace ? getNested(enMessages, namespace) : enMessages;
        const value = getNested(base, key);
        if (typeof value !== "string") {
          throw new Error(
            `Missing translation: ${namespace ? `${namespace}.` : ""}${key}`,
          );
        }
        return format(value, values);
      };
    },
  };
});

import {
  DictationErrorPanel,
  type DictationErrorPanelProps,
} from "../src/components/product/draft-flow/DictationPanel";

afterEach(() => cleanup());

function renderPanel(overrides: Partial<DictationErrorPanelProps> = {}) {
  const props: DictationErrorPanelProps = {
    error: null,
    onRetry: vi.fn(),
    onDismissError: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(React.createElement(DictationErrorPanel, props)),
  };
}

describe("DictationErrorPanel", () => {
  it("renders nothing in the idle state", () => {
    const { container } = renderPanel();
    expect(container.firstChild).toBeNull();
  });

  it("renders permission-denied error and reveals the help block on click", () => {
    const onRetry = vi.fn();
    renderPanel({ error: "permission_denied", onRetry });

    expect(
      screen.getByText(
        "Microphone access is blocked. Allow mic access in your browser settings, then try again.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Enable microphone access")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /How to enable/ }));
    expect(screen.getByText("Enable microphone access")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the network error with retry action", () => {
    const onRetry = vi.fn();
    renderPanel({ error: "network", onRetry });

    expect(screen.getByText(/Connection lost while transcribing/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders not-supported error without a retry action", () => {
    renderPanel({ error: "not_supported" });

    expect(
      screen.getByText(
        "Dictation isn't supported in this browser. Try Chrome, Safari, Edge, or Firefox.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  it("auto-dismisses transient errors after the timeout", () => {
    vi.useFakeTimers();
    const onDismissError = vi.fn();
    renderPanel({ error: "no_speech", onDismissError });

    vi.advanceTimersByTime(5_001);
    expect(onDismissError).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
