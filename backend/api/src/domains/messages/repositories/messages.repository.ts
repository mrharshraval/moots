import { prisma } from "../../../database/index.js";
import { Prisma } from "@prisma/client";

export class MessagesRepository {
  async create(data: {
    conversationId: string;
    senderParticipantId: string;
    content: string;
    contentType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
    clientMessageId?: string;
    replyToId?: string;
  }, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.create({
      data: {
        conversationId: data.conversationId,
        senderParticipantId: data.senderParticipantId,
        content: data.content,
        contentType: data.contentType || 'TEXT',
        clientMessageId: data.clientMessageId,
        replyToId: data.replyToId,
        metadata: {},
      },
      include: {
        sender: {
          include: {
            persona: true,
            actor: {
              include: { user: { select: { id: true, name: true, image: true, username: true } } }
            }
          }
        }
      }
    });
  }

  async findByCursor(conversationId: string, limit: number = 50, cursor?: string) {
    return prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          include: {
            persona: true,
            actor: {
              include: { user: { select: { id: true, name: true, image: true, username: true } } }
            }
          }
        }
      }
    });
  }

  async softDelete(messageId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });
  }

  async edit(messageId: string, newContent: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      }
    });
  }

  async updateMetadata(messageId: string, metadata: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.update({
      where: { id: messageId },
      data: { metadata }
    });
  }

  async findById(messageId: string) {
    return prisma.message.findUnique({
      where: { id: messageId }
    });
  }

  async toggleReaction(messageId: string, participantId: string, emoji: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    const existing = await db.reaction.findUnique({
      where: {
        messageId_participantId_emoji: {
          messageId,
          participantId,
          emoji,
        }
      }
    });

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } });
      return { action: 'removed', reaction: existing };
    } else {
      const reaction = await db.reaction.create({
        data: {
          messageId,
          participantId,
          emoji,
        }
      });
      return { action: 'added', reaction };
    }
  }

  async getReactions(messageId: string) {
    return prisma.reaction.findMany({
      where: { messageId },
      include: { participant: { select: { actorId: true } } }
    });
  }
}
