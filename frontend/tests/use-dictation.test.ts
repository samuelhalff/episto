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
    static autoOpen = true;

    readonly url: string;
    readyState = MockWebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onclose: ((event: Event) => void) | null = null;
    readonly send = vi.fn(
      (payload: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        if (payload === JSON.stringify({ type: "stop" })) {
          this.emitMessage({ type: "stopped" });
          this.close();
        }
      },
    );

    private readonly listeners = new Map<
      string,
      Set<(event: Event | MessageEvent<string>) => void>
    >();

    constructor(url: string) {
      this.url = url;
      MockWebSocket.instances.push(this);
      if (MockWebSocket.autoOpen) {
        queueMicrotask(() => this.open());
      }
    }

    addEventListener(
      type: string,
      listener: (event: Event | MessageEvent<string>) => void,
    ) {
      const current =
        this.listeners.get(type) ??
        new Set<(event: Event | MessageEvent<string>) => void>();
      current.add(listener);
      this.listeners.set(type, current);
    }

    removeEventListener(
      type: string,
      listener: (event: Event | MessageEvent<string>) => void,
    ) {
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
    mocks.MockWebSocket.autoOpen = true;
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

  it("replaces the current attempt transcript when buffered fallback covers audio that already produced live final text", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ transcript: "First sentence. Second dictated sentence." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([6, 6, 6]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    act(() => {
      latestSocket()?.emitMessage({ type: "final", text: "First sentence." });
      latestSocket()?.emitError();
      latestSocket()?.close();
    });

    await waitFor(() => {
      expect(result.current.finalText).toBe("First sentence. Second dictated sentence.");
    });

    expect(stopCapture).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("falls back to buffered transcription when live dictation stops without a final transcript", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ transcript: "Bitte kuendigen Sie meinen Vertrag." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([9, 8, 7]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() =>
      useDictation({ fieldContext: "intake", draftId: "draft-1" }),
    );

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    const socket = latestSocket();
    act(() => {
      socket?.emitMessage({ type: "partial", text: "Bitte kuendi" });
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(stopCapture).toHaveBeenCalledTimes(1);
    expect(socket?.send).toHaveBeenCalledWith(JSON.stringify({ type: "stop" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/dictation/transcribe?locale=de-CH&fieldContext=intake&draftId=draft-1",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.current.finalText).toBe("Bitte kuendigen Sie meinen Vertrag.");
    expect(result.current.error).toBeNull();
  });

  it("still falls back on a later dictation attempt even when earlier text already exists", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ transcript: "Second dictated sentence." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([3, 4, 5]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    act(() => {
      latestSocket()?.emitMessage({ type: "final", text: "First sentence." });
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.finalText).toBe("First sentence. Second dictated sentence.");
  });

  it("returns to idle immediately and allows another attempt while fallback transcription is still pending", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([7, 7, 7]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    const firstSocket = latestSocket();

    await act(async () => {
      void result.current.stopRecording();
      await Promise.resolve();
    });

    expect(result.current.isRecording).toBe(false);

    await act(async () => {
      await result.current.startRecording("de-CH");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.MockWebSocket.instances).toHaveLength(2);
    expect(latestSocket()).not.toBe(firstSocket);
    expect(result.current.isRecording).toBe(true);
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

  it("starts microphone capture before the live socket finishes opening and flushes queued audio once ready", async () => {
    mocks.MockWebSocket.autoOpen = false;

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.startDictationCapture.mockImplementation(async ({ onPcmChunk }) => {
      onPcmChunk(new Uint8Array([4, 5, 6]));
      return {
        stop: stopCapture,
        abort: vi.fn().mockResolvedValue(undefined),
      };
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    let startPromise: Promise<void> | undefined;
    await act(async () => {
      startPromise = result.current.startRecording("de-CH");
      await Promise.resolve();
    });

    expect(mocks.startDictationCapture).toHaveBeenCalledTimes(1);

    const socket = latestSocket();
    expect(socket?.send).not.toHaveBeenCalled();

    await act(async () => {
      socket?.open();
      if (!startPromise) {
        throw new Error("Expected startRecording to return a promise");
      }
      await startPromise;
    });

    const firstPayload = socket?.send.mock.calls[0]?.[0];
    expect(firstPayload).toBeInstanceOf(Uint8Array);
    expect(Array.from(firstPayload as Uint8Array)).toEqual([4, 5, 6]);
    expect(result.current.isRecording).toBe(true);
  });

  it("keeps recording and falls back to buffered transcription when the live socket fails before opening", async () => {
    mocks.MockWebSocket.autoOpen = false;

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ transcript: "Buffered fallback still works." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const stopCapture = vi.fn().mockResolvedValue(new Uint8Array([8, 8, 8]));
    mocks.startDictationCapture.mockResolvedValue({
      stop: stopCapture,
      abort: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useDictation({ fieldContext: "entry" }));

    const startPromise = result.current.startRecording("de-CH");
    const socket = latestSocket();

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      socket?.emitError();
      socket?.close();
    });

    await act(async () => {
      await startPromise;
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(stopCapture).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/dictation/transcribe?locale=de-CH&fieldContext=entry",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.current.finalText).toBe("Buffered fallback still works.");
    expect(result.current.error).toBeNull();
  });
});
