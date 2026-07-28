import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICTATION_LIMITS } from "@episto/shared";

let liveDictationSession: {
  writeAudio: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};
let createLiveDictationSession: ReturnType<typeof vi.fn>;
let resolveDictationContext: ReturnType<typeof vi.fn>;
let transcribeBufferedDictation: ReturnType<typeof vi.fn>;

/**
 * The handler keeps its bounds private, so the test restates them from the same
 * contract the handler derives them from: a test that read them from the module
 * would pass even if the derivation itself changed.
 */
const CAPTURE_BYTE_BUDGET = Math.ceil(
  DICTATION_LIMITS.sampleRateHz *
    DICTATION_LIMITS.channelCount *
    2 *
    DICTATION_LIMITS.maxCaptureSeconds *
    1.25,
);
const CAPTURE_DEADLINE_MS = (DICTATION_LIMITS.maxCaptureSeconds + 5) * 1000;
const STOP_GRACE_MS = 5_000;

describe("dictation routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetModules();

    resolveDictationContext = vi.fn().mockResolvedValue({
      locale: "de-CH",
      fieldContext: "entry",
      draftId: null,
      hints: ["Migros", "Swiss Post"],
    });
    liveDictationSession = {
      writeAudio: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    createLiveDictationSession = vi.fn().mockResolvedValue(liveDictationSession);
    transcribeBufferedDictation = vi
      .fn()
      .mockResolvedValue("Bitte kuendigen Sie mein Abonnement.");

    vi.doMock("../src/modules/sessions/session.middleware.js", () => ({
      getRequiredSession: vi.fn().mockImplementation((request: { session?: unknown }) => {
        if (!request.session) {
          throw new Error("Expected mocked session");
        }
        return request.session;
      }),
      requireSession: vi
        .fn()
        .mockImplementation(async (request: { session?: unknown }) => {
          request.session = {
            id: "dictation-session",
            type: "guest",
            locale: "de-CH",
            email: null,
            resumeTokenExpiresAt: new Date("2030-01-01"),
            expiresAt: new Date("2030-01-01"),
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          };
        }),
      COOKIE_NAME: "session",
    }));

    vi.doMock("../src/modules/drafting/dictation.service.js", () => ({
      createLiveDictationSession,
      resolveDictationContext,
      transcribeBufferedDictation,
    }));

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({}),
    }));

    const { dictationRoutes } =
      await import("../src/modules/drafting/dictation.routes.js");

    app = Fastify({ logger: false });
    app.setErrorHandler((error, _request, reply) => {
      const typedError = error as {
        statusCode?: number;
        code?: string;
        message?: string;
      };

      reply.status(typedError.statusCode ?? 500).send({
        code: typedError.code ?? "INTERNAL",
        message: typedError.message ?? "Unknown error",
      });
    });

    await app.register(dictationRoutes);
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    vi.resetModules();
  });

  it("transcribes raw wav audio through the backend-owned speech adapter", async () => {
    const payload = Buffer.from("RIFF");

    const response = await app.inject({
      method: "POST",
      url: "/dictation/transcribe?locale=de-CH&fieldContext=entry",
      headers: {
        "content-type": "audio/wav",
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      transcript: "Bitte kuendigen Sie mein Abonnement.",
    });
    expect(resolveDictationContext).toHaveBeenCalledWith(
      expect.anything(),
      "dictation-session",
      {
        locale: "de-CH",
        fieldContext: "entry",
      },
    );
    expect(transcribeBufferedDictation).toHaveBeenCalledWith({
      audioBuffer: payload,
      locale: "de-CH",
      hints: ["Migros", "Swiss Post"],
    });
  });

  it("rejects empty audio payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/dictation/transcribe?locale=de-CH&fieldContext=entry",
      headers: {
        "content-type": "audio/wav",
      },
      payload: Buffer.alloc(0),
    });

    expect(response.statusCode).toBe(400);
    expect(transcribeBufferedDictation).not.toHaveBeenCalled();
  });

  it("validates the dictation query before invoking the speech adapter", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/dictation/transcribe?locale=de-CH&fieldContext=body",
      headers: {
        "content-type": "audio/wav",
      },
      payload: Buffer.from("RIFF"),
    });

    expect(response.statusCode).toBe(400);
    expect(resolveDictationContext).not.toHaveBeenCalled();
    expect(transcribeBufferedDictation).not.toHaveBeenCalled();
  });

  it("opens live websocket dictation sessions and emits a ready event", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP listen address for websocket test");
    }

    const { WebSocket } = await import("ws");
    const ws = new WebSocket(
      `ws://127.0.0.1:${address.port}/dictation/live?locale=de-CH&fieldContext=entry`,
    );

    const readyEvent = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for dictation ready event"));
      }, 1000);

      ws.once("open", () => undefined);
      ws.once("message", (payload) => {
        clearTimeout(timeoutId);
        resolve(JSON.parse(payload.toString()) as Record<string, unknown>);
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
      ws.once("close", () => {
        clearTimeout(timeoutId);
        reject(new Error("Socket closed before ready event"));
      });
    });

    expect(readyEvent).toEqual({
      type: "ready",
      sampleRateHz: DICTATION_LIMITS.sampleRateHz,
      maxCaptureSeconds: DICTATION_LIMITS.maxCaptureSeconds,
    });
    expect(createLiveDictationSession).toHaveBeenCalledWith({
      locale: "de-CH",
      hints: ["Migros", "Swiss Post"],
      callbacks: expect.objectContaining({
        onPartial: expect.any(Function),
        onFinal: expect.any(Function),
        onError: expect.any(Function),
        onStopped: expect.any(Function),
      }),
    });

    ws.terminate();
  });

  it("forwards websocket audio chunks and stop controls to the live dictation session", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP listen address for websocket test");
    }

    const { WebSocket } = await import("ws");
    const ws = new WebSocket(
      `ws://127.0.0.1:${address.port}/dictation/live?locale=de-CH&fieldContext=entry`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket ready event"));
      }, 1000);

      ws.once("message", (payload) => {
        clearTimeout(timeoutId);
        const parsed = JSON.parse(payload.toString()) as { type?: string };
        if (parsed.type !== "ready") {
          reject(new Error(`Expected ready event, received ${payload.toString()}`));
          return;
        }
        resolve();
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    ws.send(Buffer.from([1, 2, 3]));
    ws.send(JSON.stringify({ type: "stop" }));

    await vi.waitFor(() => {
      expect(liveDictationSession.writeAudio).toHaveBeenCalledWith(
        Buffer.from([1, 2, 3]),
      );
      expect(liveDictationSession.stop).toHaveBeenCalledTimes(1);
    });

    ws.terminate();
  });

  it("drops audio past the capture byte budget instead of forwarding it", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP listen address for websocket test");
    }

    const { WebSocket } = await import("ws");
    const ws = new WebSocket(
      `ws://127.0.0.1:${address.port}/dictation/live?locale=de-CH&fieldContext=entry`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket ready event"));
      }, 1000);

      ws.once("message", (payload) => {
        clearTimeout(timeoutId);
        const parsed = JSON.parse(payload.toString()) as { type?: string };
        if (parsed.type !== "ready") {
          reject(new Error(`Expected ready event, received ${payload.toString()}`));
          return;
        }
        resolve();
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    const limitEvent = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for the capture limit event"));
      }, 5000);

      ws.once("message", (payload) => {
        clearTimeout(timeoutId);
        resolve(JSON.parse(payload.toString()) as Record<string, unknown>);
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    // Exactly the budget is still within it; the next frame is the one that
    // crosses, and it must never reach the billable provider stream.
    ws.send(Buffer.alloc(CAPTURE_BYTE_BUDGET));
    ws.send(Buffer.from([4, 5, 6]));

    await expect(limitEvent).resolves.toEqual({
      type: "error",
      code: "DICTATION_CAPTURE_LIMIT",
      userMessage: expect.any(String),
    });

    expect(liveDictationSession.writeAudio).toHaveBeenCalledTimes(1);
    expect((liveDictationSession.writeAudio.mock.calls[0][0] as Buffer).byteLength).toBe(
      CAPTURE_BYTE_BUDGET,
    );
    expect(liveDictationSession.stop).toHaveBeenCalledTimes(1);

    // Frames after the limit are ignored rather than merely unbilled.
    ws.send(Buffer.from([7, 8, 9]));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(liveDictationSession.writeAudio).toHaveBeenCalledTimes(1);

    ws.terminate();
  });

  it("closes the socket when the capture deadline passes with no client audio", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP listen address for websocket test");
    }

    const { WebSocket } = await import("ws");
    const events: Record<string, unknown>[] = [];

    // Only the timers the handler arms are faked, and they are faked before the
    // socket exists because the deadline is armed on connect. Real timers stay
    // out of it, so the socket still gets the event-loop ticks it needs to
    // deliver what the deadline produces.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let ws: InstanceType<typeof WebSocket> | null = null;

    try {
      ws = new WebSocket(
        `ws://127.0.0.1:${address.port}/dictation/live?locale=de-CH&fieldContext=entry`,
      );
      ws.on("message", (payload) => {
        events.push(JSON.parse(payload.toString()) as Record<string, unknown>);
      });

      for (let tick = 0; tick < 200 && events.length === 0; tick += 1) {
        await new Promise((resolve) => setImmediate(resolve));
      }

      expect(events).toEqual([
        {
          type: "ready",
          sampleRateHz: DICTATION_LIMITS.sampleRateHz,
          maxCaptureSeconds: DICTATION_LIMITS.maxCaptureSeconds,
        },
      ]);

      await vi.advanceTimersByTimeAsync(CAPTURE_DEADLINE_MS);
      expect(liveDictationSession.stop).toHaveBeenCalledTimes(1);

      // The provider resolving `stop()` is not the socket ending; the grace
      // timer is what guarantees that.
      await vi.advanceTimersByTimeAsync(STOP_GRACE_MS);

      for (let tick = 0; tick < 200 && ws.readyState !== WebSocket.CLOSED; tick += 1) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    } finally {
      vi.useRealTimers();
    }

    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(events).toContainEqual({
      type: "error",
      code: "DICTATION_CAPTURE_LIMIT",
      userMessage: expect.any(String),
    });
    expect(liveDictationSession.writeAudio).not.toHaveBeenCalled();
  });

  it("queues early websocket frames until the live dictation session is ready", async () => {
    let resolveLiveSession: ((value: typeof liveDictationSession) => void) | null = null;
    createLiveDictationSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLiveSession = resolve;
        }),
    );

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP listen address for websocket test");
    }

    const { WebSocket } = await import("ws");
    const ws = new WebSocket(
      `ws://127.0.0.1:${address.port}/dictation/live?locale=de-CH&fieldContext=entry`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket open event"));
      }, 1000);

      ws.once("open", () => {
        clearTimeout(timeoutId);
        resolve();
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    ws.send(Buffer.from([9, 8, 7]));
    ws.send(JSON.stringify({ type: "stop" }));

    resolveLiveSession?.(liveDictationSession);

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket ready event"));
      }, 1000);

      ws.once("message", (payload) => {
        clearTimeout(timeoutId);
        const parsed = JSON.parse(payload.toString()) as { type?: string };
        if (parsed.type !== "ready") {
          reject(new Error(`Expected ready event, received ${payload.toString()}`));
          return;
        }
        resolve();
      });
      ws.once("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    await vi.waitFor(() => {
      expect(liveDictationSession.writeAudio).toHaveBeenCalledWith(
        Buffer.from([9, 8, 7]),
      );
      expect(liveDictationSession.stop).toHaveBeenCalledTimes(1);
    });

    ws.terminate();
  });
});
