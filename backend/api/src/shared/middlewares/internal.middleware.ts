import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { UnauthorizedError } from "../errors/AppError.js";
import { env } from "../../config/env.js";

export const requireInternalKey = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers["x-internal-service-key"];
  
  // Make sure we have an INTERNAL_SERVICE_KEY configured
  if (!env.INTERNAL_SERVICE_KEY) {
    return next(new UnauthorizedError("Internal service key not configured"));
  }

  if (!key || typeof key !== "string") {
    return next(new UnauthorizedError("Invalid internal service key"));
  }

  const givenKeyBuffer = Buffer.from(key);
  const expectedKeyBuffer = Buffer.from(env.INTERNAL_SERVICE_KEY);

  if (givenKeyBuffer.length !== expectedKeyBuffer.length || !crypto.timingSafeEqual(givenKeyBuffer, expectedKeyBuffer)) {
    return next(new UnauthorizedError("Invalid internal service key"));
  }

  next();
};
