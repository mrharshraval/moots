import rateLimit from "express-rate-limit";

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per minute per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              10,
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
