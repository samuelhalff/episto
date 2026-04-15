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
  DictationPanel,
  type DictationPanelProps,
} from "../src/components/product/draft-flow/DictationPanel";

afterEach(() => cleanup());

function renderPanel(overrides: Partial<DictationPanelProps> = {}) {
  const props: DictationPanelProps = {
    isRecording: false,
    isProcessing: false,
    audioLevel: 0,
    elapsedSeconds: 0,
    maxCaptureSeconds: 120,
    interimText: "",
    locale: "en-CH",
    error: null,
    onStop: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onDismissError: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(React.createElement(DictationPanel, props)),
  };
}

describe("DictationPanel", () => {
  it("renders nothing in the idle state", () => {
    const { container } = renderPanel();
    expect(container.firstChild).toBeNull();
  });

  it("renders the listening label with language and timer while recording", () => {
    renderPanel({ isRecording: true, audioLevel: 0.6, elapsedSeconds: 7 });

    expect(screen.getByText("Listening in English")).toBeTruthy();
    expect(screen.getByText("0:07 / 2:00")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Stop$/ })).toBeTruthy();
  });

  it("shows the interim transcript while recording", () => {
    renderPanel({
      isRecording: true,
      interimText: "Sehr geehrte Damen und Herren",
    });
    expect(screen.getByText("Sehr geehrte Damen und Herren")).toBeTruthy();
  });

  it("swaps to the transcribing label while processing", () => {
    renderPanel({ isProcessing: true });
    expect(screen.getByText("Transcribing…")).toBeTruthy();
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

  it("fires onStop and onCancel from the panel buttons while recording", () => {
    const onStop = vi.fn();
    const onCancel = vi.fn();
    renderPanel({ isRecording: true, onStop, onCancel });

    fireEvent.click(screen.getByRole("button", { name: /^Stop$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
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
