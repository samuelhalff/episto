import pino from "pino";
import { env } from "../config/index.js";

export function createLogger(name?: string): pino.Logger {
  const e = env();
  return pino({
    name: name ?? "swiss-mail",
    level: e.LOG_LEVEL,
    ...(e.NODE_ENV === "development"
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
