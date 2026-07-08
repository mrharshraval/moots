import { Request, Response } from "express";
import { ModerationService } from "../services/moderation.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess, sendError } from "../../../shared/utils/response.js";
import { CreateReportSchema } from "../dto/moderation.dto.js";

export class ModerationController {
  private service = new ModerationService();

  createReport = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user?.actorId;
    if (!actorId) {
      return sendError(res, "UNAUTHORIZED", "Not authenticated", [], 401);
    }

    const validation = CreateReportSchema.safeParse({ body: req.body });
    if (!validation.success) {
      return sendError(res, "VALIDATION_ERROR", "Invalid report data", validation.error.issues, 400);
    }

    const clientIp = Array.isArray(req.headers["x-forwarded-for"]) 
      ? req.headers["x-forwarded-for"][0] 
      : req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";

    const result = await this.service.reportTarget(actorId, validation.data.body, clientIp);
    return sendSuccess(res, result, {}, 201);
  });
}
