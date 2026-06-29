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
}
