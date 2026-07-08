import { Request, Response } from "express";
import { MessagesService } from "../services/messages.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import {
  CreateMessageInternalSchema,
  EditMessageInternalSchema,
  ReactionInternalSchema,
  ReadInternalSchema,
} from "@moots/contracts";
import { EventBus } from "../../../shared/events/event-bus.js";

export class MessagesController {
  private service: MessagesService;

  constructor(deps: { messagesService: MessagesService }) {
    this.service = deps.messagesService;
  }

  createInternal = asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateMessageInternalSchema.shape.body.parse(req.body);
    const message = await this.service.sendMessage(parsed);
    return sendSuccess(res, message, { status: 201 });
  });

  editInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newContent, actorId } = EditMessageInternalSchema.shape.body.parse(req.body);
    
    const message = await this.service.editMessage(id as string, newContent, actorId);
    return sendSuccess(res, message);
  });

  reactionInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji, actorId } = ReactionInternalSchema.shape.body.parse(req.body);
    
    const message = await this.service.toggleReaction(id as string, emoji, actorId);
    return sendSuccess(res, message);
  });

  readInternal = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, actorId } = ReadInternalSchema.shape.body.parse(req.body);
    
    await this.service.markRead(conversationId, actorId);
    
    return sendSuccess(res, { success: true });
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit, cursor } = req.query;
    const actorId = (req as any).user?.actorId;

    if (!actorId) {
      return sendSuccess(res, { messages: [] }, { status: 401 });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const messages = await this.service.getMessages(id as string, limitNum, cursor as string, actorId);

    return sendSuccess(res, { messages });
  });
}
