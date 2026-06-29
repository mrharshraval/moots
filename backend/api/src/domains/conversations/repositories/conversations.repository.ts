import { prisma } from "../../../database/index.js";
import { Conversation, Participant, Message, Connection, ConnectionStatus, ConversationStatus, Prisma } from "@prisma/client";

export class ConversationsRepository {
  async findConversationSummaries(actorId: string, cursor?: string, limit: number = 25) {
    // Early return optimization
    const count = await prisma.participant.count({ where: { actorId, hasLeft: false } });
    if (count === 0) return { items: [], nextCursor: null };

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { actorId, hasLeft: false } }
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        lastMessageId: true,
        lastMessagePreview: true,
        lastActivityAt: true,
        updatedAt: true,
        participants: {
          select: {
            isPinned: true,
            isArchived: true,
            isMuted: true,
            unreadCount: true,
            actorId: true,
            actor: {
              select: {
                type: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let nextCursor: string | null = null;
    if (conversations.length > limit) {
      const nextItem = conversations.pop();
      nextCursor = nextItem!.id;
    }

    return { items: conversations, nextCursor };
  }

  async updateParticipantSettings(actorId: string, conversationId: string, data: any, tx?: Prisma.TransactionClient) {
    return (tx || prisma).participant.update({
      where: {
        actorId_conversationId: { actorId, conversationId }
      },
      data
    });
  }

  async getConversationWithParticipants(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: { participants: { include: { actor: { include: { user: true, guestSession: true } } } } }
    });
  }

  async deleteMessages(conversationId: string, tx?: Prisma.TransactionClient) {
    return (tx || prisma).message.deleteMany({
      where: { conversationId }
    });
  }

  async findConnection(actorId1: string, actorId2: string) {
    return prisma.connection.findFirst({
      where: {
        OR: [
          { actor1Id: actorId1, actor2Id: actorId2, status: ConnectionStatus.ACCEPTED },
          { actor1Id: actorId2, actor2Id: actorId1, status: ConnectionStatus.ACCEPTED }
        ]
      }
    });
  }

  async deleteConversation(id: string, tx?: Prisma.TransactionClient) {
    return (tx || prisma).conversation.delete({ where: { id } });
  }

  async updateConversationStatus(id: string, status: ConversationStatus, tx?: Prisma.TransactionClient) {
    return (tx || prisma).conversation.update({
      where: { id },
      data: { status }
    });
  }
}
