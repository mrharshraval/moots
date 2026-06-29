import pino from "pino";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
  base: { service: "api" },
});

export default logger;
