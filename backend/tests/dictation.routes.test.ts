import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let resolveDictationContext: ReturnType<typeof vi.fn>;
let transcribeBufferedDictation: ReturnType<typeof vi.fn>;

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
      requireSession: vi.fn().mockImplementation(async (request: { session?: unknown }) => {
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
      resolveDictationContext,
      transcribeBufferedDictation,
    }));

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({}),
    }));

    const { dictationRoutes } = await import("../src/modules/drafting/dictation.routes.js");

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
});
