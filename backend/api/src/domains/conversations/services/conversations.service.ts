import { ConversationsRepository } from "../repositories/conversations.repository.js";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { ConversationStatus } from "@prisma/client";
import { prisma } from "../../../database/index.js";
import { UpdateConversationSettingsInput, DeleteConversationInput } from "../dto/conversations.dto.js";

export class ConversationsService {
  private repository: ConversationsRepository;

  constructor() {
    this.repository = new ConversationsRepository();
  }

  async getUserConversations(actorId: string, cursor?: string, limit?: number) {
    const { items, nextCursor } = await this.repository.findConversationSummaries(actorId, cursor, limit);

    const conversations = items.map((conv: any) => {
      const currentUserParticipant = conv.participants.find((p: any) => p.actorId === actorId) || conv.participants[0];
      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        status: conv.status,
        isPinned: currentUserParticipant?.isPinned || false,
        isArchived: currentUserParticipant?.isArchived || false,
        isMuted: currentUserParticipant?.isMuted || false,
        unreadCount: currentUserParticipant?.unreadCount || 0,
        participants: conv.participants.map((p: any) => p.actor?.user || { id: p.actorId, type: p.actor?.type }),
        lastMessagePreview: conv.lastMessagePreview,
        lastMessageId: conv.lastMessageId,
        lastActivityAt: conv.lastActivityAt,
        updatedAt: conv.updatedAt
      };
    });

    return { conversations, nextCursor };
  }

  async updateSettings(conversationId: string, data: UpdateConversationSettingsInput["body"] & { actorId: string }) {
    const { actorId, isPinned, isArchived, isMuted, unreadCount } = data;

    const updateData: any = {};
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (isMuted !== undefined) updateData.isMuted = isMuted;
    if (unreadCount !== undefined) updateData.unreadCount = unreadCount;

    return this.repository.updateParticipantSettings(actorId, conversationId, updateData);
  }

  async deleteOrClearConversation(conversationId: string, data: DeleteConversationInput["body"] & { actorId: string }) {
    const { actorId, clearOnly } = data;

    const conversation = await this.repository.getConversationWithParticipants(conversationId);
    if (!conversation) {
      throw new NotFoundError("Not found");
    }

    if (clearOnly) {
      await this.repository.deleteMessages(conversationId);
      return { message: "Chat cleared" };
    }

    const isAnyGuest = conversation.participants.some((p: any) => p.actor?.type === 'GUEST');
    const actorIds = conversation.participants.map((p: any) => p.actorId);
    const a1 = actorIds[0] || "";
    const a2 = actorIds[1] || "";

    const isFriends = await this.repository.findConnection(a1, a2);

    return prisma.$transaction(async (tx) => {
      if (isAnyGuest) {
        await this.repository.deleteConversation(conversationId, tx);
        return { message: "Conversation deleted for guest" };
      }

      if (!isFriends) {
        await this.repository.deleteMessages(conversationId, tx);
      }
      
      await this.repository.updateConversationStatus(conversationId, ConversationStatus.DELETED, tx);
      return { message: "Conversation ended" };
    });
  }
}
