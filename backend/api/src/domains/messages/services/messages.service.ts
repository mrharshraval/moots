import { MessagesRepository } from "../repositories/messages.repository.js";
import { prisma } from "../../../database/index.js";
import { NotFoundError } from "../../../shared/errors/AppError.js";

export class MessagesService {
  private repository: MessagesRepository;

  constructor() {
    this.repository = new MessagesRepository();
  }

  async sendMessage(data: {
    conversationId: string;
    senderParticipantId: string;
    content: string;
    contentType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
    clientMessageId?: string;
    replyToId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const message = await this.repository.create(data, tx);

      const previewText = data.contentType === 'TEXT' || !data.contentType ? data.content : `[${data.contentType}]`;
      
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageId: message.id,
          lastMessagePreview: previewText.substring(0, 100),
          lastActivityAt: message.createdAt
        }
      });

      await tx.domainEvent.create({
        data: {
          eventType: "message.sent",
          aggregateId: message.id,
          aggregateType: "Message",
          payload: {
            id: message.id,
            conversationId: message.conversationId,
            senderParticipantId: message.senderParticipantId,
            content: message.content,
            contentType: message.contentType,
            clientMessageId: message.clientMessageId,
            replyToId: message.replyToId,
            createdAt: message.createdAt,
          }
        }
      });

      return message;
    });
  }

  async getMessages(conversationId: string, limit?: number, cursor?: string) {
    const messages = await this.repository.findByCursor(conversationId, limit, cursor);
    return messages.map((msg: any) => ({
      ...msg,
      sender: this.resolveIdentity(msg.sender)
    }));
  }

  private resolveIdentity(participant: any) {
    if (participant.identityState === "REVEALED" || participant.identityState === "VERIFIED") {
      return {
        id: participant.actorId,
        type: participant.actor.type,
        user: participant.actor.user,
        identityState: participant.identityState,
      };
    }

    const persona = participant.persona || { displayName: "Stranger", avatarSeed: participant.actorId };
    return {
      id: participant.actorId,
      type: participant.actor.type,
      persona,
      identityState: participant.identityState,
    };
  }

  async deleteMessage(messageId: string) {
    return prisma.$transaction(async (tx) => {
      const message = await this.repository.softDelete(messageId, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "message.deleted",
          aggregateId: messageId,
          aggregateType: "Message",
          payload: {
            messageId,
            conversationId: message.conversationId,
          }
        }
      });

      return message;
    });
  }

  async editMessage(messageId: string, newContent: string) {
    return prisma.$transaction(async (tx) => {
      const message = await this.repository.edit(messageId, newContent, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "message.edited",
          aggregateId: messageId,
          aggregateType: "Message",
          payload: {
            messageId,
            conversationId: message.conversationId,
            content: newContent,
            edited: true,
          }
        }
      });

      return message;
    });
  }

  async toggleReaction(messageId: string, emoji: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const message = await this.repository.findById(messageId);
      if (!message) throw new NotFoundError("Message not found");

      const metadata = (message.metadata as any) || {};
      const reactions = metadata.reactions || {};

      // Remove actor from all other reactions
      for (const key in reactions) {
        if (key !== emoji) {
          reactions[key] = reactions[key].filter((id: string) => id !== actorId);
          if (reactions[key].length === 0) {
            delete reactions[key];
          }
        }
      }

      const list = reactions[emoji] || [];
      const exists = list.includes(actorId);
      reactions[emoji] = exists ? list.filter((id: string) => id !== actorId) : [...list, actorId];

      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }

      metadata.reactions = reactions;

      const updatedMessage = await this.repository.updateMetadata(messageId, metadata, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "reaction.updated",
          aggregateId: messageId,
          aggregateType: "Message",
          payload: {
            messageId,
            conversationId: message.conversationId,
            reactions,
          }
        }
      });

      return updatedMessage;
    });
  }
}
