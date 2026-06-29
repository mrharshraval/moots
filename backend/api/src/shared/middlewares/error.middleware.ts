import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../logger.js";
import { sendError } from "../utils/response.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, error: err }, `[${err.errorCode}] ${err.message}`);
    }
    return sendError(res, err.errorCode, err.message, err.details, err.statusCode);
  }

  // Handle Prisma Errors if they leak through
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    logger.error({ requestId, error: err }, `Database Error: ${err.message}`);
    return sendError(res, "DATABASE_ERROR", "A database error occurred", [], 500);
  }

  // Fallback for unhandled errors
  logger.error({ requestId, stack: err.stack, error: err }, `Unhandled Exception: ${err.message}`);
  return sendError(res, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", [], 500);
};
