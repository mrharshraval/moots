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
    metadata?: any;
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
        metadata: data.metadata || {},
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
        },
        receipts: true,
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

  async edit(messageId: string, newContent: string, newMetadata?: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
        ...(newMetadata ? { metadata: newMetadata } : {})
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

  async findById(messageId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.message.findUnique({
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

  async getReactions(messageId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.reaction.findMany({
      where: { messageId },
      include: { participant: { select: { actorId: true } } }
    });
  }

  async markUnreadMessagesAsRead(conversationId: string, participantId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    
    // Find all messages in the conversation that are NOT sent by this participant
    // and for which there is no READ receipt from this participant.
    const messages = await db.message.findMany({
      where: {
        conversationId,
        senderParticipantId: { not: participantId },
        NOT: {
          receipts: {
            some: {
              participantId,
              status: "READ"
            }
          }
        }
      },
      select: { id: true }
    });

    if (messages.length === 0) return 0;

    // We can't do createMany on receipts easily if there are unique constraints and we want to update.
    // So we use an upsert loop (or executeRaw for bulk upsert, but loop is safer for now).
    let count = 0;
    for (const msg of messages) {
      await db.messageReceipt.upsert({
        where: {
          messageId_participantId: {
            messageId: msg.id,
            participantId
          }
        },
        create: {
          messageId: msg.id,
          participantId,
          actorId,
          status: "READ"
        },
        update: {
          status: "READ"
        }
      });
      count++;
    }
    return count;
  }
}
