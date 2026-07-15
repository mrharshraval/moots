import { MessagesRepository } from "../repositories/messages.repository.js";
import { prisma } from "../../../database/index.js";
import { NotFoundError, ForbiddenError } from "../../../shared/errors/AppError.js";
import { EventBus } from "../../../shared/events/event-bus.js";
import { MessageSerializer } from "./message-serializer.service.js";
import { NotificationType } from "@prisma/client";

export class MessagesService {
  private repository: MessagesRepository;
  private serializer: MessageSerializer;

  constructor() {
    this.repository = new MessagesRepository();
    this.serializer = new MessageSerializer();
  }

  async sendMessage(data: {
    conversationId: string;
    senderParticipantId: string; // Actually receives actorId from Realtime
    content: string;
    contentType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
    clientMessageId?: string;
    replyToId?: string;
    metadata?: any;
  }) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: {
          actorId_conversationId: {
            actorId: data.senderParticipantId,
            conversationId: data.conversationId,
          }
        },
        select: { id: true, conversation: { select: { status: true } } }
      });

      if (!participant) {
        throw new NotFoundError(`Participant not found for actor ${data.senderParticipantId} in conversation ${data.conversationId}`);
      }

      if (participant.conversation.status !== 'ACTIVE') {
        throw new ForbiddenError("Conversation is no longer active");
      }

      // Mentions parsing
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const matches = [...data.content.matchAll(mentionRegex)];
      let mentions: string[] = [];
      if (matches.length > 0) {
        const usernames = matches.map(m => m[1]);
        const mentionedUsers = await tx.user.findMany({
          where: { username: { in: usernames } },
          select: { actors: { select: { id: true }, take: 1 } }
        });
        mentions = mentionedUsers.flatMap(u => u.actors.map(a => a.id));
      }

      const createData = {
        ...data,
        metadata: {
          ...data.metadata,
          mentions: mentions.length > 0 ? mentions : data.metadata?.mentions
        },
        senderParticipantId: participant.id // Use actual Participant ID
      };

      const message = await this.repository.create(createData, tx);
      
      // Determine other participants to notify
      const otherParticipants = await tx.participant.findMany({
        where: { conversationId: data.conversationId, actorId: { not: data.senderParticipantId } },
        select: { actorId: true }
      });

      for (const p of otherParticipants) {
        let notifType: NotificationType = NotificationType.NEW_MESSAGE;
        if (data.replyToId) {
          // Check if this reply is specifically to this participant's message
          const repliedMsg = await tx.message.findUnique({ where: { id: data.replyToId }, select: { sender: { select: { actorId: true } } } });
          if (repliedMsg && repliedMsg.sender?.actorId === p.actorId) {
            notifType = NotificationType.MESSAGE_REPLY;
          }
        }
        if (mentions.includes(p.actorId)) {
          notifType = NotificationType.MENTION;
        }

        const idempotencyKey = `msg_${message.id}_${notifType}`;

        const notif = await tx.notification.upsert({
          where: {
            actorId_idempotencyKey: {
              actorId: p.actorId,
              idempotencyKey
            }
          },
          update: {},
          create: {
            actorId: p.actorId,
            type: notifType,
            entityId: message.id,
            idempotencyKey,
            payload: {
              conversationId: data.conversationId,
              senderId: data.senderParticipantId,
              messageId: message.id,
              preview: data.content.substring(0, 50),
            }
          }
        });

        await EventBus.publish(tx, "notification.created", notif.id, "Notification", {
          id: notif.id,
          actorId: notif.actorId,
          type: notif.type,
          entityId: notif.entityId,
          payload: notif.payload,
          createdAt: notif.createdAt.toISOString(),
        });
      }

      const previewText = data.contentType === 'TEXT' || !data.contentType ? data.content : `[${data.contentType}]`;
      
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageId: message.id,
          lastMessagePreview: previewText.substring(0, 100),
          lastActivityAt: message.createdAt
        }
      });

      // Restore visibility for any participant who previously hid this conversation
      await tx.participant.updateMany({
        where: { conversationId: data.conversationId, hiddenAt: { not: null } },
        data: { hiddenAt: null }
      });

      const personaMap = new Map();

      personaMap.set(message.senderParticipantId, (message as any).sender.persona || { displayName: "Stranger", avatarSeed: (message as any).sender.actorId });

      const serializedMessage = this.serializer.serialize(message as any, personaMap);

      await EventBus.publish(tx, "message.persisted", message.id, "Message", {
        ...serializedMessage,
        clientMessageId: message.clientMessageId,
        conversationId: message.conversationId,
        senderActorId: (message as any).sender.actorId, // Retained for backend Realtime routing logic
      });

      return message;
    });
  }

  async getMessages(conversationId: string, limit?: number, cursor?: string, actorId?: string) {
    if (!actorId) throw new NotFoundError("Conversation not found");

    const participant = await prisma.participant.findUnique({
      where: {
        actorId_conversationId: {
          actorId,
          conversationId,
        }
      }
    });

    if (!participant) {
      throw new NotFoundError("Conversation not found");
    }

    const messages = await this.repository.findByCursor(conversationId, limit, cursor, (participant as any).historyClearedAt);
    
    const personaMap = new Map();

    for (const msg of messages) {
      const sender: any = (msg as any).sender;
      personaMap.set(msg.senderParticipantId, sender.persona || { displayName: "Stranger", avatarSeed: sender.actorId });
    }

    return messages.map((msg: any) => this.serializer.serialize(msg, personaMap));
  }

  async deleteMessage(messageId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const existingMessage = await this.repository.findById(messageId, tx);
      if (!existingMessage) throw new NotFoundError("Message not found");

      const conversation = await tx.conversation.findUnique({
        where: { id: existingMessage.conversationId },
        select: { status: true }
      });
      if (conversation?.status !== 'ACTIVE') {
        throw new ForbiddenError("Conversation is no longer active");
      }

      if (!existingMessage.senderParticipantId) throw new ForbiddenError("Cannot delete a system or orphaned message");

      const senderParticipant: any = await tx.participant.findUnique({
        where: { id: existingMessage.senderParticipantId },
        select: { actorId: true }
      });

      if (!senderParticipant || senderParticipant.actorId !== actorId) {
        throw new NotFoundError("Message not found or you don't have permission to delete it");
      }

      const message = await this.repository.softDelete(messageId, tx);

      await EventBus.publish(tx, "message.deleted", messageId, "Message", {
        messageId,
        conversationId: message.conversationId,
      });

      return message;
    });
  }

  async editMessage(messageId: string, newContent: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const existingMessage = await this.repository.findById(messageId, tx);
      if (!existingMessage) throw new NotFoundError("Message not found");
      
      const conversation = await tx.conversation.findUnique({
        where: { id: existingMessage.conversationId },
        select: { status: true }
      });
      if (conversation?.status !== 'ACTIVE') {
        throw new ForbiddenError("Conversation is no longer active");
      }

      if (!existingMessage.senderParticipantId) throw new ForbiddenError("Cannot edit a system or orphaned message");

      const senderParticipant: any = await tx.participant.findUnique({
        where: { id: existingMessage.senderParticipantId },
        select: { actorId: true }
      });
      
      if (!senderParticipant || senderParticipant.actorId !== actorId) {
        throw new NotFoundError("Message not found or you don't have permission to edit it");
      }

      const existingMetadata: any = existingMessage.metadata || {};
      const editHistory = existingMetadata.editHistory || [];
      editHistory.push({
        content: existingMessage.content,
        editedAt: new Date().toISOString()
      });

      const newMetadata = {
        ...existingMetadata,
        editHistory
      };

      const message = await this.repository.edit(messageId, newContent, newMetadata, tx);

      await EventBus.publish(tx, "message.edited", messageId, "Message", {
        messageId,
        conversationId: message.conversationId,
        content: newContent,
      });

      return message;
    });
  }

  async toggleReaction(messageId: string, emoji: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const message = await this.repository.findById(messageId, tx);
      if (!message) throw new NotFoundError("Message not found");

      const conversation = await tx.conversation.findUnique({
        where: { id: message.conversationId },
        select: { status: true }
      });
      if (conversation?.status !== 'ACTIVE') {
        throw new ForbiddenError("Conversation is no longer active");
      }

      const participant = await tx.participant.findUnique({
        where: {
          actorId_conversationId: {
            actorId,
            conversationId: message.conversationId,
          }
        }
      });

      if (!participant) {
        throw new NotFoundError("Message not found or you don't have permission to react to it");
      }

      const result = await this.repository.toggleReaction(messageId, participant.id, emoji, tx);

      // We still need to broadcast all reactions to the client as a map
      const allReactions = await this.repository.getReactions(messageId, tx);
      const reactionsMap: Record<string, string[]> = {};
      for (const reaction of allReactions) {
        if (!reactionsMap[reaction.emoji]) {
          reactionsMap[reaction.emoji] = [];
        }
        reactionsMap[reaction.emoji].push(reaction.participant.actorId);
      }

      await EventBus.publish(tx, "reaction.updated", messageId, "Message", {
        messageId,
        conversationId: message.conversationId,
        reactions: reactionsMap,
      });

      return result;
    });
  }

  async markRead(conversationId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });
      
      if (!participant) return;

      await tx.participant.update({
        where: { id: participant.id },
        data: { unreadCount: 0 }
      });

      const count = await this.repository.markUnreadMessagesAsRead(conversationId, participant.id, actorId, tx);

      await EventBus.publish(tx, "participant.read", conversationId, "Conversation", {
        conversationId,
        actorId,
        receiptsCreated: count
      });
    });
  }
}
