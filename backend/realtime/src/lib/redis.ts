import { Redis } from "ioredis";
import { env } from "../env.js";
import { logger } from "./logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const redisSub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  logger.info("Connected to Redis Client");
});

redisSub.on("connect", () => {
  logger.info("Connected to Redis Sub Client");
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis Client error");
});

redisSub.on("error", (err) => {
  logger.error({ err }, "Redis Sub Client error");
});
