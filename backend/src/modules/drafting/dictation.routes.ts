import fastifyWebsocket, { type WebSocket } from "@fastify/websocket";
import {
  DICTATION_LIMITS,
  DictationLiveClientEventSchema,
  DictationLiveServerEventSchema,
  DictationSessionQuerySchema,
  DictationTranscriptionResponseSchema,
} from "@swiss-mail/shared";
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
      { preHandler: [requireSession] },
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
      { websocket: true, preHandler: [requireSession] },
      (socket: WebSocket, request: FastifyRequest) => {
        let socketClosed = false;

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
              if (message) {
                liveSession.writeAudio(message);
              }
            });
          },
        );

        socket.on("close", () => {
          socketClosed = true;
          void liveSessionPromise.then(async (liveSession) => {
            await liveSession?.close();
          });
        });

        socket.on("error", () => {
          socketClosed = true;
          void liveSessionPromise.then(async (liveSession) => {
            await liveSession?.close();
          });
        });
      },
    );
  });
}
