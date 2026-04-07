// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;
    static instances: MockEventSource[] = [];

    readonly url: string;
    readonly init?: EventSourceInit | undefined;
    readonly close = vi.fn(() => {
      this.readyState = MockEventSource.CLOSED;
    });

    readyState = MockEventSource.OPEN;
    private readonly listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();

    constructor(url: string, init?: EventSourceInit | undefined) {
      this.url = url;
      this.init = init;
      MockEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
      const listeners = this.listeners.get(type) ?? new Set<(event: MessageEvent<string>) => void>();
      listeners.add(listener);
      this.listeners.set(type, listeners);
    }

    emit(type: string, data: unknown) {
      const event = { data: JSON.stringify(data) } as MessageEvent<string>;
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    }
  }

  return {
    MockEventSource,
    captureMessage: vi.fn(),
  };
});

vi.mock("../src/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock("../src/lib/error-tracking", () => ({
  captureMessage: mocks.captureMessage,
}));

import { useDraftStream } from "../src/hooks/use-draft-stream";

function getActiveEventSource() {
  return [...mocks.MockEventSource.instances]
    .reverse()
    .find((instance) => instance.close.mock.calls.length === 0);
}

describe("useDraftStream", () => {
  beforeEach(() => {
    mocks.MockEventSource.instances.length = 0;
    mocks.captureMessage.mockReset();
    vi.stubGlobal("EventSource", mocks.MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reuses one EventSource per draft and fans out events to all subscribers", () => {
    const first = renderHook(() => useDraftStream("draft-1"));
    const second = renderHook(() => useDraftStream("draft-1"));

    expect(getActiveEventSource()).toBeDefined();
    expect(getActiveEventSource()?.url).toBe("https://api.test/v1/drafts/draft-1/stream");
    expect(getActiveEventSource()?.init).toEqual({ withCredentials: true });

    const firstListener = vi.fn();
    const secondListener = vi.fn();

    act(() => {
      first.result.current.subscribe(firstListener);
      second.result.current.subscribe(secondListener);
    });

    act(() => {
      getActiveEventSource()?.emit("connected", { draftId: "draft-1" });
      getActiveEventSource()?.emit("field_update", {
        field: "subject",
        value: "Termination notice",
        updatedAt: "2026-04-07T00:00:00.000Z",
      });
    });

    expect(firstListener).toHaveBeenLastCalledWith({
      type: "field_update",
      data: {
        field: "subject",
        value: "Termination notice",
        updatedAt: "2026-04-07T00:00:00.000Z",
      },
    });
    expect(secondListener).toHaveBeenLastCalledWith({
      type: "field_update",
      data: {
        field: "subject",
        value: "Termination notice",
        updatedAt: "2026-04-07T00:00:00.000Z",
      },
    });
  });

  it("keeps the shared EventSource alive until the last hook unmounts", () => {
    const first = renderHook(() => useDraftStream("draft-1"));
    const second = renderHook(() => useDraftStream("draft-1"));

    const eventSource = getActiveEventSource();
    expect(eventSource).toBeDefined();

    first.unmount();
    expect(eventSource?.close).not.toHaveBeenCalled();

    second.unmount();
    expect(eventSource?.close).toHaveBeenCalledTimes(1);
  });
});
