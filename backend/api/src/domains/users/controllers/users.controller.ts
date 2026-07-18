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
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { prisma } = await import("../../../database/index.js");
    const actor = await prisma.actor.findUnique({ 
      where: { id: actorId },
      include: { user: true }
    });

    if (!actor) {
      throw new Error("Actor not found");
    }

    if (actor.user) {
      return sendSuccess(res, {
        id: actor.user.id,
        email: actor.user.email,
        username: actor.user.username,
        name: actor.user.name,
        bio: actor.user.bio,
        image: actor.user.image,
        createdAt: actor.user.createdAt
      });
    } else {
      return sendSuccess(res, {
        id: actorId,
        name: "Guest"
      });
    }
  });
}
