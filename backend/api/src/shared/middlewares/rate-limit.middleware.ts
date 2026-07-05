import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";

const redisClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const createStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    prefix,
  });
};

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per minute per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              10,
  store:            createStore("rl:auth:"),
  standardHeaders:  "draft-7",
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      code:    "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please wait before trying again.",
    },
  },
});

/**
 * Standard rate limiter for all write API endpoints.
 * 60 requests per minute per IP.
 */
export const writeRateLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              60,
  store:            createStore("rl:write:"),
  standardHeaders:  "draft-7",
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      code:    "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
    },
  },
});

/**
 * Permissive rate limiter for read endpoints.
 * 120 requests per minute per IP.
 */
export const readRateLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              120,
  store:            createStore("rl:read:"),
  standardHeaders:  "draft-7",
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      code:    "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
    },
  },
});
