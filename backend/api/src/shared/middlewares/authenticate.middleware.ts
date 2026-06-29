import { Request, Response, NextFunction } from "express";
import { jwtService } from "../../lib/auth/jwt.service.js";
import { UnauthorizedError } from "../errors/AppError.js";
import { requestContext } from "../context.js";

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Populates req.user and injects actorId into AsyncLocalStorage context.
 *
 * Apply to every route except /api/auth/* and /health.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwtService.verify(token);
    req.user = payload;

    // Inject actorId into AsyncLocalStorage so logger and downstream code can read it.
    const store = requestContext.getStore();
    if (store) {
      (store as any).actorId = payload.actorId;
    }

    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};
