import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";
import { getRequestId } from "../shared/context.js";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
  ]
});

// Prisma Query Instrumentation
prisma.$on("query" as never, (e: any) => {
  const reqId = getRequestId();
  if (e.duration > 100) {
    logger.warn({
      requestId: reqId,
      duration: e.duration,
      params: e.params
    }, `Slow Database Query: ${e.query}`);
  } else {
    logger.debug({
      requestId: reqId,
      duration: e.duration,
      params: e.params
    }, `Database Query: ${e.query}`);
  }
});

prisma.$on("error" as never, (e: any) => {
  const reqId = getRequestId();
  logger.error({
    requestId: reqId,
    errorMessage: e.message
  }, `Database Error: ${e.message}`);
});
