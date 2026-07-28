import fastifyWebsocket, { type WebSocket } from "@fastify/websocket";
import {
  DICTATION_LIMITS,
  DictationLiveClientEventSchema,
  DictationLiveServerEventSchema,
  DictationSessionQuerySchema,
  DictationTranscriptionResponseSchema,
} from "@episto/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { getDb } from "../../db/index.js";
import { AppError, validationError } from "../../shared/errors/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import {
  createLiveDictationSession,
  resolveDictationContext,
  transcribeBufferedDictation,
} from "./dictation.service.js";

const WS_CONNECTING = 0;
const WS_OPEN = 1;

function parseDictationQuery(query: unknown) {
  const parsed = DictationSessionQuerySchema.safeParse(query ?? {});

  if (!parsed.success) {
    throw validationError(
      "Invalid dictation request",
      parsed.error.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      })),
    );
  }

  return parsed.data;
}

function sendSocketEvent(
  socket: { readyState: number; send: (payload: string) => void },
  event: unknown,
) {
  if (socket.readyState !== WS_OPEN) {
    return;
  }

  socket.send(JSON.stringify(DictationLiveServerEventSchema.parse(event)));
}

function closeSocket(socket: { readyState: number; close: () => void }) {
  if (socket.readyState === WS_CONNECTING || socket.readyState === WS_OPEN) {
    socket.close();
  }
}

/**
 * What the client is allowed to send before we stop listening.
 *
 * `maxCaptureSeconds` was only ever advertised in the `ready` event, which
 * makes it a request, not a limit: a socket that ignores it keeps an Azure
 * Speech stream open — and billing — for as long as it likes. Two bounds are
 * needed, because the two ways to overspend are different. Wall clock stops the
 * socket that stays open; the byte budget stops the one that streams a
 * pre-recorded hour faster than real time, where the clock never notices.
 *
 * The byte figure is the audio the contract itself describes: 16 kHz, one
 * channel, 16-bit PCM, for the advertised duration, plus a quarter for framing
 * and for a client whose clock runs slightly fast.
 */
const CAPTURE_DEADLINE_MS = (DICTATION_LIMITS.maxCaptureSeconds + 5) * 1000;
const CAPTURE_BYTE_BUDGET = Math.ceil(
  DICTATION_LIMITS.sampleRateHz *
    DICTATION_LIMITS.channelCount *
    2 *
    DICTATION_LIMITS.maxCaptureSeconds *
    1.25,
);

/** A stop that does not complete must still end the socket. */
const STOP_GRACE_MS = 5_000;

function getSocketUserMessage(error: unknown) {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  return error instanceof Error
    ? error.message
    : "Voice input is temporarily unavailable.";
}

function normalizeRawMessage(rawMessage: unknown): Buffer | null {
  if (Buffer.isBuffer(rawMessage)) {
    return rawMessage;
  }

  if (rawMessage instanceof ArrayBuffer) {
    return Buffer.from(rawMessage);
  }

  if (Array.isArray(rawMessage)) {
    return Buffer.concat(rawMessage.map((chunk) => Buffer.from(chunk)));
  }

  return null;
}

function normalizeTextMessage(rawMessage: unknown): string | null {
  if (typeof rawMessage === "string") {
    return rawMessage;
  }

  const message = normalizeRawMessage(rawMessage);
  return message ? message.toString("utf8") : null;
}

export async function dictationRoutes(app: FastifyInstance): Promise<void> {
  await app.register(fastifyWebsocket);

  await app.register(async function dictationAudioRoutes(dictationApp) {
    dictationApp.addContentTypeParser(
      /^audio\/(wav|x-wav)$/u,
      { parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      },
    );

    dictationApp.post(
      "/dictation/transcribe",
      {
        preHandler: [requireSession],
        config: {
          // Azure Speech is billed per second of audio and this route had no
          // cap of its own — only the global 100/min/IP, which a five-megabyte
          // upload per request makes an expensive allowance. Keyed on `req.ip`
          // because @fastify/rate-limit runs in the onRequest phase, before
          // `requireSession` populates the session (see draft.routes.ts).
          rateLimit: {
            max: 60,
            timeWindow: "1 hour",
            keyGenerator: (req: FastifyRequest) => req.ip,
          },
        },
      },
      async (request, reply) => {
        const query = parseDictationQuery(request.query);
        const audioBuffer = Buffer.isBuffer(request.body) ? request.body : null;

        if (!audioBuffer || audioBuffer.byteLength === 0) {
          throw validationError("Audio payload is required", [
            {
              field: "body",
              message: "Provide a non-empty audio/wav payload.",
            },
          ]);
        }

        if (audioBuffer.byteLength > DICTATION_LIMITS.maxFallbackBytes) {
          throw validationError("Audio payload exceeds the dictation upload limit", [
            {
              field: "body",
              message: `Maximum upload size is ${Math.round(
                DICTATION_LIMITS.maxFallbackBytes / 1024 / 1024,
              )} MB.`,
            },
          ]);
        }

        const context = await resolveDictationContext(
          getDb(),
          getRequiredSession(request).id,
          query,
        );
        const transcript = await transcribeBufferedDictation({
          audioBuffer,
          locale: context.locale,
          hints: context.hints,
        });

        reply.send(
          DictationTranscriptionResponseSchema.parse({
            transcript,
          }),
        );
      },
    );

    dictationApp.get(
      "/dictation/live",
      {
        websocket: true,
        preHandler: [requireSession],
        // A live socket bills for as long as it stays open, so the cap is on
        // how often one client may open one, not on messages within it.
        config: {
          rateLimit: {
            max: 30,
            timeWindow: "1 hour",
            keyGenerator: (req: FastifyRequest) => req.ip,
          },
        },
      },
      (socket: WebSocket, request: FastifyRequest) => {
        let socketClosed = false;
        let audioBytesReceived = 0;
        let captureEnded = false;
        let captureDeadline: NodeJS.Timeout | undefined;
        let stopGrace: NodeJS.Timeout | undefined;

        function clearTimers() {
          if (captureDeadline) clearTimeout(captureDeadline);
          if (stopGrace) clearTimeout(stopGrace);
          captureDeadline = undefined;
          stopGrace = undefined;
        }

        /**
         * End the capture from our side. `stop()` is the graceful path — it
         * flushes the provider's last final result, which is the sentence the
         * user is mid-way through — but it talks to the network, so the socket
         * cannot be left waiting on it indefinitely.
         */
        function endCapture(liveSession: { stop: () => Promise<unknown> } | null) {
          if (captureEnded) return;
          captureEnded = true;

          sendSocketEvent(socket, {
            type: "error",
            code: "DICTATION_CAPTURE_LIMIT",
            userMessage:
              "Voice input stopped after the maximum recording length. You can start again.",
          });

          stopGrace = setTimeout(() => closeSocket(socket), STOP_GRACE_MS);
          stopGrace.unref?.();

          if (!liveSession) {
            closeSocket(socket);
            return;
          }

          void liveSession.stop().catch(() => closeSocket(socket));
        }

        const liveSessionPromise = (async () => {
          const query = parseDictationQuery(request.query);
          const context = await resolveDictationContext(
            getDb(),
            getRequiredSession(request).id,
            query,
          );
          const liveSession = await createLiveDictationSession({
            locale: context.locale,
            hints: context.hints,
            callbacks: {
              onPartial: (text) => {
                sendSocketEvent(socket, {
                  type: "partial",
                  text,
                });
              },
              onFinal: (text) => {
                sendSocketEvent(socket, {
                  type: "final",
                  text,
                });
              },
              onError: (error) => {
                sendSocketEvent(socket, {
                  type: "error",
                  code: "DICTATION_PROVIDER_UNAVAILABLE",
                  userMessage: getSocketUserMessage(error),
                });
                closeSocket(socket);
              },
              onStopped: () => {
                sendSocketEvent(socket, {
                  type: "stopped",
                });
                closeSocket(socket);
              },
            },
          });

          if (socketClosed) {
            await liveSession.close();
            return null;
          }

          sendSocketEvent(socket, {
            type: "ready",
            sampleRateHz: DICTATION_LIMITS.sampleRateHz,
            maxCaptureSeconds: DICTATION_LIMITS.maxCaptureSeconds,
          });

          return liveSession;
        })().catch((error) => {
          sendSocketEvent(socket, {
            type: "error",
            code: "DICTATION_PROVIDER_UNAVAILABLE",
            userMessage: getSocketUserMessage(error),
          });
          closeSocket(socket);
          return null;
        });

        // Armed from the moment the socket exists, not from the first audio
        // frame: a socket that connects and then says nothing still holds a
        // provider session open.
        captureDeadline = setTimeout(() => {
          void liveSessionPromise.then((liveSession) => endCapture(liveSession));
        }, CAPTURE_DEADLINE_MS);
        captureDeadline.unref?.();

        socket.on(
          "message",
          (rawMessage: Buffer | string | ArrayBuffer | Buffer[], isBinary: boolean) => {
            void liveSessionPromise.then((liveSession) => {
              if (!liveSession) {
                return;
              }

              if (!isBinary) {
                const message = normalizeTextMessage(rawMessage);
                if (!message) {
                  sendSocketEvent(socket, {
                    type: "error",
                    code: "DICTATION_CONTROL_INVALID",
                    userMessage: "The dictation session control message was invalid.",
                  });
                  closeSocket(socket);
                  return;
                }

                let parsedMessage: unknown;
                try {
                  parsedMessage = JSON.parse(message);
                } catch {
                  sendSocketEvent(socket, {
                    type: "error",
                    code: "DICTATION_CONTROL_INVALID",
                    userMessage: "The dictation session control message was invalid.",
                  });
                  closeSocket(socket);
                  return;
                }

                const parsedJson =
                  DictationLiveClientEventSchema.safeParse(parsedMessage);
                if (!parsedJson.success) {
                  sendSocketEvent(socket, {
                    type: "error",
                    code: "DICTATION_CONTROL_INVALID",
                    userMessage: "The dictation session control message was invalid.",
                  });
                  closeSocket(socket);
                  return;
                }

                if (parsedJson.data.type === "stop") {
                  captureEnded = true;
                  if (captureDeadline) clearTimeout(captureDeadline);
                  captureDeadline = undefined;
                  void liveSession.stop().catch((error) => {
                    sendSocketEvent(socket, {
                      type: "error",
                      code: "DICTATION_PROVIDER_UNAVAILABLE",
                      userMessage: getSocketUserMessage(error),
                    });
                    closeSocket(socket);
                  });
                }

                return;
              }

              const message = normalizeRawMessage(rawMessage);
              if (!message) {
                return;
              }

              // Counted before the write, and the frame that crosses the line
              // is dropped rather than forwarded: past the budget every byte
              // handed to the provider is billable.
              audioBytesReceived += message.byteLength;
              if (audioBytesReceived > CAPTURE_BYTE_BUDGET) {
                endCapture(liveSession);
                return;
              }

              if (captureEnded) {
                return;
              }

              liveSession.writeAudio(message);
            });
          },
        );

        socket.on("close", () => {
          socketClosed = true;
          clearTimers();
          void liveSessionPromise.then(async (liveSession) => {
            await liveSession?.close();
          });
        });

        socket.on("error", () => {
          socketClosed = true;
          clearTimers();
          void liveSessionPromise.then(async (liveSession) => {
            await liveSession?.close();
          });
        });
      },
    );
  });
}
