import pino from "pino";
import { env } from "../env.js";

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  base: { service: "realtime" },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,service",
          },
        },
      }),
});

export type LogLevel = "debug" | "info" | "warn" | "error";

// Helper to construct log strings with structured metadata
export function structuredLog(
  event: string,
  connectionId: string,
  metadata: any = {},
  level: LogLevel = "info",
  conn?: any // Pass the connection object explicitly to avoid circular dependency with registry
) {
  const reqId = metadata.requestId || conn?.requestId || "N/A";
  const userId = metadata.userId || conn?.userId || "N/A";
  const sessionId = metadata.sessionId || conn?.sessionId || "N/A";

  const logPayload = {
    requestId: reqId !== "N/A" ? reqId : undefined,
    connectionId,
    userId: userId !== "N/A" ? userId : undefined,
    sessionId: sessionId !== "N/A" ? sessionId : undefined,
    action: event,
    ...(metadata.details && { details: metadata.details }),
  };

  const message = `WebSocket Event [${event}]${metadata.details ? `: ${metadata.details}` : ""}`;
  logger[level](logPayload, message);
}

export default logger;
