import { prisma } from "../../../database/index.js";
import { User, Conversation, Message } from "@prisma/client";

export class SearchRepository {
  async searchUsers(query: string, limit: number): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async searchConversations(query: string, actorId: string, limit: number): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        participants: {
          some: { actorId, hasLeft: false },
        },
        status: "ACTIVE",
      },
      take: limit,
      orderBy: { lastActivityAt: "desc" },
    });
  }

  async searchMessages(query: string, actorId: string, limit: number): Promise<Message[]> {
    return prisma.message.findMany({
      where: {
        content: { contains: query, mode: "insensitive" },
        deletedAt: null,
        conversation: {
          participants: {
            some: { actorId, hasLeft: false },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          include: { actor: { include: { user: true } } },
        },
      },
    });
  }
}
