import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess, sendError } from "../../../shared/utils/response.js";
import { MarkAsReadRequestSchema } from "@moots/contracts";
import { z } from "zod";

export class NotificationController {
  private service = new NotificationService();

  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user?.actorId;
    if (!actorId) {
      return sendError(res, "UNAUTHORIZED", "Not authenticated", [], 401);
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;

    const result = await this.service.getNotifications(actorId, limit, cursor);
    return sendSuccess(res, result);
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user?.actorId;
    if (!actorId) {
      return sendError(res, "UNAUTHORIZED", "Not authenticated", [], 401);
    }

    const validation = MarkAsReadRequestSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, "VALIDATION_ERROR", "Invalid request", validation.error.issues, 400);
    }

    await this.service.markAsRead(validation.data.params.id, actorId);
    return sendSuccess(res, { success: true });
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user?.actorId;
    if (!actorId) {
      return sendError(res, "UNAUTHORIZED", "Not authenticated", [], 401);
    }

    await this.service.markAllAsRead(actorId);
    return sendSuccess(res, { success: true });
  });
}
