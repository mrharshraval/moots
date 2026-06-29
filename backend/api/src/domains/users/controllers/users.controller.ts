import { Request, Response } from "express";
import { UsersService } from "../services/users.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { UpdateSettingsInput } from "../dto/users.dto.js";

export class UsersController {
  private service: UsersService;

  constructor() {
    this.service = new UsersService();
  }

  updateSettings = asyncHandler(async (req: Request<{}, {}, UpdateSettingsInput>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { prisma } = await import("../../../database/index.js");
    const actor = await prisma.actor.findUnique({ where: { id: actorId } });
    if (!actor || !actor.userId) {
      throw new Error("User not found or is guest");
    }
    const userId = actor.userId;
    const { username, name, bio, image } = req.body;

    const user = await this.service.updateSettings({ userId, username, name, bio, image });

    return sendSuccess(res, { user }, { message: "Profile updated successfully" });
  });
}
