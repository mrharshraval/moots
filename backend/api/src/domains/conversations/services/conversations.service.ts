import { ConversationsRepository } from "../repositories/conversations.repository.js";
import { NotFoundError, ForbiddenError } from "../../../shared/errors/AppError.js";
import { EventBus } from "../../../shared/events/event-bus.js";
import { ConversationStatus } from "@prisma/client";
import { prisma } from "../../../database/index.js";
import { UpdateConversationSettingsInput } from "../dto/conversations.dto.js";

export class ConversationsService {
  private repository: ConversationsRepository;

  constructor() {
    this.repository = new ConversationsRepository();
  }

  async createConversation(id: string, policyId: string, actorId1: string, actorId2: string, metadata?: any) {
    return this.repository.createMatchConversation({
      id,
      policyId,
      actorId1,
      actorId2,
      metadata
    });
  }

  async createGroupConversation(creatorActorId: string, name: string, initialParticipantIds: string[] = []) {
    const allParticipants = Array.from(new Set([creatorActorId, ...initialParticipantIds]));
    
    return this.repository.createConversation({
      id: undefined, // Prisma will generate CUID
      policyId: undefined, // Group conversations don't strictly need a matchmaking policy
      kind: "GROUP",
      type: "GROUP",
      status: "ACTIVE",
      name,
      participants: allParticipants.map(actorId => ({
        actorId,
        role: actorId === creatorActorId ? "OWNER" : "MEMBER"
      }))
    });
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
        hiddenAt: currentUserParticipant?.hiddenAt || null,
        leftAt: currentUserParticipant?.leftAt || null,
        unreadCount: currentUserParticipant?.unreadCount || 0,
        participants: conv.participants.map((p: any) => {
          if (p.persona) {
            return {
              id: p.actorId,
              name: p.persona.displayName,
              username: 'Anonymous',
              image: `https://api.dicebear.com/7.x/bottts/svg?seed=${p.persona.avatarSeed}`,
              isAnonymous: true
            };
          }
          return p.actor?.user || { id: p.actorId, type: p.actor?.type };
        }),
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

  async endConversation(conversationId: string, actorId: string) {
    const conversation = await this.repository.getConversationWithParticipants(conversationId);
    if (!conversation) {
      throw new NotFoundError("Not found");
    }

    const participant = conversation.participants.find((p: any) => p.actorId === actorId);
    if (!participant) {
      throw new NotFoundError("Not found or no permission to access this conversation");
    }

    if (conversation.status === ConversationStatus.ENDED) {
      return { message: "Conversation already ended" };
    }

    return prisma.$transaction(async (tx) => {
      const endedAt = new Date();
      const expiresAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.conversation.update({
        where: { id: conversationId },
        data: { 
          status: ConversationStatus.ENDED,
          endedAt,
          expiresAt,
          endedByActorId: actorId
        }
      });

      // Clear activeMatchConversationId from participants
      for (const p of conversation.participants) {
        await tx.actor.update({
          where: { id: p.actorId },
          data: { activeMatchConversationId: null }
        });
      }

      await EventBus.publish(tx, "conversation.ended", conversationId, "Conversation", {
        conversationId,
        endedAt: endedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        endedByActorId: actorId,
        broadcastRule: "TO_CONVERSATION"
      });

      return { message: "Conversation ended" };
    });
  }

  async createGroupInvite(conversationId: string, creatorActorId: string, maxUses?: number, expiresInMs?: number) {
    const participant = await prisma.participant.findUnique({
      where: { actorId_conversationId: { actorId: creatorActorId, conversationId } }
    });
    if (!participant || participant.role !== "OWNER") {
      throw new NotFoundError("Conversation not found or you don't have permission to invite");
    }

    const { randomBytes } = await import("crypto");
    const code = randomBytes(6).toString("hex");

    return prisma.groupInvite.create({
      data: {
        conversationId,
        createdById: creatorActorId,
        code,
        maxUses,
        expiresAt: expiresInMs ? new Date(Date.now() + expiresInMs) : null
      }
    });
  }

  async joinGroupInvite(code: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.groupInvite.findUnique({
        where: { code },
        include: { conversation: true }
      });

      if (!invite || invite.revokedAt || (invite.expiresAt && invite.expiresAt < new Date()) || (invite.maxUses && invite.useCount >= invite.maxUses)) {
        throw new NotFoundError("Invalid or expired invite code");
      }

      if (invite.conversation.type !== "GROUP" || invite.conversation.status !== "ACTIVE") {
        throw new NotFoundError("Conversation is no longer active");
      }

      const existingParticipant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId: invite.conversationId } }
      });

      if (existingParticipant) {
        if (existingParticipant.hasLeft) {
          await tx.participant.update({
            where: { id: existingParticipant.id },
            data: { hasLeft: false, role: "MEMBER" }
          });
        }
        return { message: "Joined", conversationId: invite.conversationId };
      }

      await tx.participant.create({
        data: {
          actorId,
          conversationId: invite.conversationId,
          role: "MEMBER"
        }
      });

      await tx.groupInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } }
      });

      await EventBus.publish(tx, "participant.joined", invite.conversationId, "Conversation", {
        conversationId: invite.conversationId,
        actorId,
        role: "MEMBER"
      });

      return { message: "Joined", conversationId: invite.conversationId };
    });
  }

  async kickParticipant(conversationId: string, actorId: string, targetActorId: string) {
    return prisma.$transaction(async (tx) => {
      const requester = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
        throw new ForbiddenError("Not authorized to kick participants");
      }

      const target = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId: targetActorId, conversationId } }
      });
      if (!target || target.hasLeft) {
        throw new NotFoundError("Participant not found");
      }
      if (target.role === "OWNER") {
        throw new ForbiddenError("Cannot kick the owner");
      }

      await tx.participant.update({
        where: { id: target.id },
        data: { hasLeft: true, leftAt: new Date() }
      });

      await EventBus.publish(tx, "participant.left", conversationId, "Conversation", {
        conversationId,
        actorId: targetActorId,
        kickedBy: actorId
      });

      return { message: "Participant kicked" };
    });
  }

  async leaveConversation(conversationId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      if (!participant || participant.hasLeft) {
        throw new NotFoundError("Participant not found");
      }

      await tx.participant.update({
        where: { id: participant.id },
        data: { hasLeft: true, leftAt: new Date() }
      });

      await EventBus.publish(tx, "participant.left", conversationId, "Conversation", {
        conversationId,
        actorId,
        broadcastRule: "TO_CONVERSATION"
      });

      return { message: "Left conversation" };
    });
  }

  async updateParticipantRole(conversationId: string, actorId: string, targetActorId: string, newRole: "ADMIN" | "MEMBER") {
    return prisma.$transaction(async (tx) => {
      const requester = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      if (!requester || requester.role !== "OWNER") {
        throw new ForbiddenError("Only the owner can change roles");
      }

      const target = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId: targetActorId, conversationId } }
      });
      if (!target || target.hasLeft) {
        throw new NotFoundError("Participant not found");
      }

      await tx.participant.update({
        where: { id: target.id },
        data: { role: newRole }
      });

      await EventBus.publish(tx, "participant.role_updated", conversationId, "Conversation", {
        conversationId,
        actorId: targetActorId,
        role: newRole
      });

      return { message: "Role updated" };
    });
  }

  async hideConversation(conversationId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      if (!participant) {
        throw new NotFoundError("Participant not found");
      }

      const now = new Date();
      await tx.participant.update({
        where: { id: participant.id },
        data: { hiddenAt: now, historyClearedAt: now }
      });

      await EventBus.publish(tx, "conversation.hidden", conversationId, "Conversation", {
        conversationId,
        actorId,
        hiddenAt: now.toISOString(),
        historyClearedAt: now.toISOString(),
        broadcastRule: "TO_SELF"
      });

      return { message: "Conversation hidden and history cleared", hiddenAt: now };
    });
  }

  async unhideConversation(conversationId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      if (!participant) {
        throw new NotFoundError("Participant not found");
      }

      await tx.participant.update({
        where: { id: participant.id },
        data: { hiddenAt: null }
      });

      return { message: "Conversation unhidden", hiddenAt: null };
    });
  }
}
