import { Request, Response } from "express";
import { MessagesService } from "../services/messages.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { z } from "zod";

export class MessagesController {
  private service: MessagesService;

  constructor(deps: { messagesService: MessagesService }) {
    this.service = deps.messagesService;
  }

  createInternal = asyncHandler(async (req: Request, res: Response) => {
    // Basic validation
    const schema = z.object({
      conversationId: z.string(),
      senderParticipantId: z.string(),
      content: z.string(),
      contentType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
      clientMessageId: z.string().optional(),
      replyToId: z.string().optional(),
    });

    const parsed = schema.parse(req.body);
    const message = await this.service.sendMessage(parsed);
    return sendSuccess(res, message, { status: 201 });
  });

  editInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newContent } = z.object({ newContent: z.string() }).parse(req.body);
    
    const message = await this.service.editMessage(id as string, newContent);
    return sendSuccess(res, message);
  });

  reactionInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji, actorId } = z.object({ emoji: z.string(), actorId: z.string() }).parse(req.body);
    
    const message = await this.service.toggleReaction(id as string, emoji, actorId);
    return sendSuccess(res, message);
  });

  readInternal = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, actorId } = z.object({ conversationId: z.string(), actorId: z.string() }).parse(req.body);
    
    const { prisma } = await import("../../../database/index.js");
    await prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { actorId_conversationId: { actorId, conversationId } },
        data: { unreadCount: 0 }
      });

      await tx.domainEvent.create({
        data: {
          eventType: "participant.read",
          aggregateId: conversationId,
          aggregateType: "Conversation",
          payload: {
            conversationId,
            actorId,
          }
        }
      });
    });
    
    return sendSuccess(res, { success: true });
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit, cursor } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const messages = await this.service.getMessages(id as string, limitNum, cursor as string);

    return sendSuccess(res, { messages });
  });
}
