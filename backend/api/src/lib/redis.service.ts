import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

export class RedisService {
  public client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.client.on("connect", () => {
      logger.info("Connected to Redis");
    });

    this.client.on("error", (err) => {
      logger.error({ err }, "Redis error");
    });
  }
}
