import { Request, Response } from "express";
import { ConversationsService } from "../services/conversations.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { GetUserConversationsInput, UpdateConversationSettingsInput, EndConversationInput } from "../dto/conversations.dto.js";
import { z } from "zod";
import { EventBus } from "../../../shared/events/event-bus.js";
export class ConversationsController {
  private service: ConversationsService;

  constructor() {
    this.service = new ConversationsService();
  }

  getUserConversations = asyncHandler(async (req: Request<{}, {}, {}, GetUserConversationsInput["query"]>, res: Response) => {
    const actorId          = req.user!.actorId!;
    const { cursor, limit } = req.query;

    const parsedLimit = limit ? parseInt(limit as unknown as string, 10) : undefined;
    const { conversations, nextCursor } = await this.service.getUserConversations(actorId, cursor as string | undefined, parsedLimit);
    return sendSuccess(res, { conversations, nextCursor });
  });

  updateSettings = asyncHandler(async (req: Request<UpdateConversationSettingsInput["params"], {}, UpdateConversationSettingsInput["body"]>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    const { isPinned, isArchived, isMuted, unreadCount } = req.body;

    const participant = await this.service.updateSettings(id, { actorId, isPinned, isArchived, isMuted, unreadCount });
    return sendSuccess(res, { participant });
  });

  endConversation = asyncHandler(async (req: Request<EndConversationInput["params"]>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;

    const result = await this.service.endConversation(id, actorId);
    return sendSuccess(res, result);
  });



  createGroup = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { name, participantActorIds } = req.body; // should be validated by CreateGroupConversationSchema
    
    const conversation = await this.service.createGroupConversation(actorId, name, participantActorIds);
    return sendSuccess(res, { conversation }, { status: 201 });
  });

  createInvite = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    const { maxUses, expiresInMs } = req.body;
    
    const invite = await this.service.createGroupInvite(id as string, actorId, maxUses, expiresInMs);
    return sendSuccess(res, { invite }, { status: 201 });
  });

  joinInvite = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { code } = req.params;
    
    const result = await this.service.joinGroupInvite(code as string, actorId);
    return sendSuccess(res, result);
  });

  kickParticipant = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id, targetActorId } = req.params;
    
    const result = await this.service.kickParticipant(id as string, actorId, targetActorId as string);
    return sendSuccess(res, result);
  });

  leaveConversation = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    
    const result = await this.service.leaveConversation(id as string, actorId);
    return sendSuccess(res, result);
  });

  updateParticipantRole = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id, targetActorId } = req.params;
    const { role } = req.body;
    
    const result = await this.service.updateParticipantRole(id as string, actorId, targetActorId as string, role);
    return sendSuccess(res, result);
  });

  hideConversation = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    
    const result = await this.service.hideConversation(id as string, actorId);
    return sendSuccess(res, result);
  });

  unhideConversation = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    
    const result = await this.service.unhideConversation(id as string, actorId);
    return sendSuccess(res, result);
  });

  getSessionMetadata = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.service.getSessionMetadata(id as string);
    return sendSuccess(res, result);
  });
}
