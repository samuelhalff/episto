import pino from "pino";
import { env, isEnvLoaded } from "../config/index.js";

export function createLogger(name?: string): pino.Logger {
  // Support top-level module initialization before loadEnv() has been called.
  // In production the env is always loaded before any request is served;
  // this fallback only covers the brief window during ESM module evaluation.
  const level = isEnvLoaded() ? env().LOG_LEVEL : "info";
  const isDev = isEnvLoaded() ? env().NODE_ENV === "development" : false;

  return pino({
    name: name ?? "swiss-mail",
    level,
    ...(isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
    serializers: pino.stdSerializers,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
