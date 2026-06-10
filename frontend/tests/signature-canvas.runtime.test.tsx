// @vitest-environment jsdom

import { cleanup, render, screen, act } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signaturePadState = vi.hoisted(() => ({
  instances: [] as Array<{
    empty: boolean;
    options: { onEnd?: () => void };
    clear: () => void;
    on: () => void;
    off: () => void;
    isEmpty: () => boolean;
    toData: () => unknown[];
    fromData: () => void;
  }>,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      signatureClear: "Clear",
      signatureDrawHint: "Draw your signature",
    })[key] ?? key,
}));

vi.mock("signature_pad", () => ({
  default: class MockSignaturePad {
    empty = true;
    options: { onEnd?: () => void };

    constructor(_canvas: HTMLCanvasElement, options: { onEnd?: () => void }) {
      this.options = options;
      signaturePadState.instances.push(this);
    }

    clear = () => {
      this.empty = true;
    };

    on = () => undefined;

    off = () => undefined;

    isEmpty = () => this.empty;

    toData = () => [{ points: [{ x: 1, y: 1, time: 1 }] }];

    fromData = () => undefined;
  },
}));

import { SignatureCanvas } from "@/components/product/SignatureCanvas";

function installCanvasMocks() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined;
      }

      disconnect() {
        return undefined;
      }
    },
  );

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    scale: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 360,
    height: 160,
    top: 0,
    left: 0,
    right: 360,
    bottom: 160,
    x: 0,
    y: 0,
    toJSON: () => undefined,
  } as DOMRect);
}

describe("SignatureCanvas runtime behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    signaturePadState.instances.length = 0;
    installCanvasMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllTimers();
  });

  it("enables the clear action immediately when the first stroke ends", () => {
    const onSignature = vi.fn();
    const onClear = vi.fn();

    render(<SignatureCanvas onSignature={onSignature} onClear={onClear} />);

    const clearButton = screen.getByRole("button", { name: "Clear" });
    expect(clearButton).toBeTruthy();
    expect((clearButton as HTMLButtonElement).disabled).toBe(true);

    const pad = signaturePadState.instances[0];
    pad.empty = false;

    act(() => {
      pad.options.onEnd?.();
    });

    expect((clearButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps the pad instance stable when the callback prop changes", () => {
    const onClear = vi.fn();
    const firstOnSignature = vi.fn();
    const secondOnSignature = vi.fn();

    const { rerender } = render(
      <SignatureCanvas onSignature={firstOnSignature} onClear={onClear} />,
    );

    expect(signaturePadState.instances).toHaveLength(1);

    rerender(<SignatureCanvas onSignature={secondOnSignature} onClear={onClear} />);

    expect(signaturePadState.instances).toHaveLength(1);
  });
});
