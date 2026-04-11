// @vitest-environment jsdom

import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances: MockWebSocket[] = [];

    readonly url: string;
    readyState = MockWebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onclose: ((event: Event) => void) | null = null;
    readonly send = vi.fn((payload: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      if (payload === JSON.stringify({ type: "stop" })) {
        this.emitMessage({ type: "stopped" });
        this.close();
      }
    });

    private readonly listeners = new Map<string, Set<(event: Event | MessageEvent<string>) => void>>();

    constructor(url: string) {
      this.url = url;
      MockWebSocket.instances.push(this);
      queueMicrotask(() => this.open());
    }

    addEventListener(type: string, listener: (event: Event | MessageEvent<string>) => void) {
      const current = this.listeners.get(type) ?? new Set<(event: Event | MessageEvent<string>) => void>();
      current.add(listener);
      this.listeners.set(type, current);
    }

    removeEventListener(type: string, listener: (event: Event | MessageEvent<string>) => void) {
      this.listeners.get(type)?.delete(listener);
    }

    open() {
      this.readyState = MockWebSocket.OPEN;
      const event = new Event("open");
      this.onopen?.(event);
      for (const listener of this.listeners.get("open") ?? []) {
        listener(event);
      }
    }

    emitMessage(data: unknown) {
      const event = new MessageEvent("message", {
        data: JSON.stringify(data),
      });
      this.onmessage?.(event);
      for (const listener of this.listeners.get("message") ?? []) {
        listener(event);
      }
    }

    emitError() {
      const event = new Event("error");
      this.onerror?.(event);
      for (const listener of this.listeners.get("error") ?? []) {
        listener(event);
      }
    }

    close() {
      if (this.readyState === MockWebSocket.CLOSED) {
        return;
      }

      this.readyState = MockWebSocket.CLOSED;
      const event = new Event("close");
      this.onclose?.(event);
      for (const listener of this.listeners.get("close") ?? []) {
        listener(event);
      }
    }
  }

  return {
    MockWebSocket,
    startDictationCapture: vi.fn(),
  };
});

vi.mock("../src/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
  getApiWebSocketUrl: (path: string) => `wss://api.test${path}`,
}));

vi.mock("../src/lib/dictation-audio", () => ({
  supportsDictationCapture: () => true,
  startDictationCapture: mocks.startDictationCapture,
  buildWavBlob: (pcmBytes: Uint8Array) => new Blob([pcmBytes], { type: "audio/wav" }),
}));

import { useDictation } from "../src/hooks/use-dictation";

function latestSocket() {
  return mocks.MockWebSocket.instances[mocks.MockWebSocket.instances.length - 1];
}

describe("useDictation", () => {
  beforeEach(() => {
    mocks.MockWebSocket.instances.length = 0;
    mocks.startDictationCapture.mockReset();
    vi.stubGlobal("WebSocket", mocks.MockWebSocket as unknown as typeof WebSocket);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("streams live dictation through the backend websocket route", async () => {
    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.startDictationCapture.mockImplementation(async ({ onPcmChunk }) => {
      onPcmChunk(new Uint8Array([1, 2, 3]));
      return {
        stop: stopCapture,
        abort: vi.fn().mockResolvedValue(undefined),
      };
    });

    const { result } = renderHook(() =>
      useDictation({ draftId: "draft-1", fieldContext: "intake" }),
    );

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    const socket = latestSocket();
    expect(socket?.url).toBe(
      "wss://api.test/v1/dictation/live?locale=de-CH&fieldContext=intake&draftId=draft-1",
    );

    act(() => {
      socket?.emitMessage({ type: "partial", text: "Bonj" });
      socket?.emitMessage({ type: "final", text: "Bonjour" });
    });

    expect(result.current.interimText).toBe("");
    expect(result.current.finalText).toBe("Bonjour");

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(stopCapture).toHaveBeenCalledTimes(1);
    expect(socket?.send).toHaveBeenCalledWith(JSON.stringify({ type: "stop" }));
    expect(result.current.isRecording).toBe(false);
  });

  it("falls back to buffered transcription when the live socket fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ transcript: "Veuillez resilier mon abonnement." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([5, 6, 7]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    act(() => {
      latestSocket()?.emitError();
      latestSocket()?.close();
    });

    await waitFor(() => {
      expect(result.current.finalText).toBe("Veuillez resilier mon abonnement.");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/dictation/transcribe?locale=de-CH&fieldContext=entry",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "audio/wav",
          "X-Requested-With": "XMLHttpRequest",
        }),
      }),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.isRecording).toBe(false);
  });

  it("maps microphone permission failures to the existing dictation error state", async () => {
    mocks.startDictationCapture.mockRejectedValue(
      Object.assign(new Error("permission denied"), {
        name: "NotAllowedError",
      }),
    );

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    expect(result.current.error).toBe("permission_denied");
    expect(result.current.isRecording).toBe(false);
  });
});
