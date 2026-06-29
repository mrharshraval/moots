import { Request, Response } from "express";
import { ConversationsService } from "../services/conversations.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { GetUserConversationsInput, UpdateConversationSettingsInput, DeleteConversationInput } from "../dto/conversations.dto.js";
import { z } from "zod";

export class ConversationsController {
  private service: ConversationsService;

  constructor() {
    this.service = new ConversationsService();
  }

  getUserConversations = asyncHandler(async (req: Request<{}, {}, {}, GetUserConversationsInput["query"]>, res: Response) => {
    const actorId          = req.user!.actorId!;
    const { cursor, limit } = req.query;

    const { conversations, nextCursor } = await this.service.getUserConversations(actorId, cursor, limit);
    return sendSuccess(res, { conversations, nextCursor });
  });

  updateSettings = asyncHandler(async (req: Request<UpdateConversationSettingsInput["params"], {}, UpdateConversationSettingsInput["body"]>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    const { isPinned, isArchived, isMuted, unreadCount } = req.body;

    const participant = await this.service.updateSettings(id, { actorId, isPinned, isArchived, isMuted, unreadCount });
    return sendSuccess(res, { participant });
  });

  deleteConversation = asyncHandler(async (req: Request<DeleteConversationInput["params"], {}, DeleteConversationInput["body"]>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    const { clearOnly } = req.body;

    const result = await this.service.deleteOrClearConversation(id, { actorId, clearOnly });
    return sendSuccess(res, result);
  });

  revealIdentityInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { actorId } = z.object({ actorId: z.string() }).parse(req.body);
    
    const { prisma } = await import("../../../database/index.js");
    
    await prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { actorId_conversationId: { actorId, conversationId: id as string } },
        data: { identityState: "REVEALED" }
      });

      await tx.domainEvent.create({
        data: {
          eventType: "identity.reveal_confirmed",
          aggregateId: id as string,
          aggregateType: "Conversation",
          payload: {
            conversationId: id as string,
            actorId,
          }
        }
      });
    });
    
    return sendSuccess(res, { success: true });
  });
}
