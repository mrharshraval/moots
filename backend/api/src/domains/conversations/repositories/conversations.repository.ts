import { prisma } from "../../../database/index.js";
import { Conversation, Participant, Message, Connection, ConnectionStatus, ConversationStatus, Prisma, ParticipantRole } from "@prisma/client";

export class ConversationsRepository {
  async createConversation(data: { id?: string; name?: string; policyId?: string; kind: any; type: any; status: any; participants: { actorId: string; role?: string; persona?: { displayName: string; avatarSeed: string; } }[] }) {
    return prisma.conversation.create({
      data: {
        id: data.id,
        name: data.name,
        policyId: data.policyId,
        kind: data.kind,
        type: data.type,
        status: data.status,
        participants: {
          create: data.participants.map(p => ({
            actor: { connect: { id: p.actorId } },
            role: (p.role as ParticipantRole) || "MEMBER",
            ...(p.persona ? {
              persona: {
                create: {
                  displayName: p.persona.displayName,
                  avatarSeed: p.persona.avatarSeed,
                }
              }
            } : {})
          }))
        }
      }
    });
  }

  async createMatchConversation(data: { id?: string; policyId?: string; actorId1: string; actorId2: string; metadata?: any }) {
    return prisma.$transaction(async (tx) => {
      // 1. Transactional lock: Check if either actor has an active match.
      const actors = await tx.actor.findMany({
        where: { id: { in: [data.actorId1, data.actorId2] } }
      });
      
      const actor1 = actors.find(a => a.id === data.actorId1);
      const actor2 = actors.find(a => a.id === data.actorId2);
      
      if (!actor1 || !actor2) throw new Error("Actor not found");
      if (actor1.activeMatchConversationId || actor2.activeMatchConversationId) {
        throw new Error("One or both actors already have an active match");
      }

      const actor1Meta = data.metadata?.actor1 || {};
      const actor2Meta = data.metadata?.actor2 || {};

      const conversation = await tx.conversation.create({
        data: {
          id: data.id,
          policyId: data.policyId,
          kind: "MATCH",
          type: "DIRECT",
          status: "ACTIVE",
          participants: {
            create: [
              {
                actor: { connect: { id: data.actorId1 } },
                role: "MEMBER",
                ...(actor1Meta.nickname ? { persona: { create: { displayName: actor1Meta.nickname, avatarSeed: data.actorId1 } } } : {})
              },
              {
                actor: { connect: { id: data.actorId2 } },
                role: "MEMBER",
                ...(actor2Meta.nickname ? { persona: { create: { displayName: actor2Meta.nickname, avatarSeed: data.actorId2 } } } : {})
              }
            ]
          }
        }
      });

      // 2. Set the activeMatchConversationId for both actors
      await tx.actor.update({
        where: { id: data.actorId1 },
        data: { activeMatchConversationId: conversation.id }
      });
      await tx.actor.update({
        where: { id: data.actorId2 },
        data: { activeMatchConversationId: conversation.id }
      });

      return conversation;
    });
  }

  async findConversationSummaries(actorId: string, cursor?: string, limit: number = 25) {
    // Early return optimization
    const count = await prisma.participant.count({ where: { actorId, hasLeft: false } });
    if (count === 0) return { items: [], nextCursor: null };

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { 
          some: { 
            actorId, 
            hasLeft: false,
            hiddenAt: null // Exclude conversations that the user has cleared/removed
          } 
        }
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
            persona: {
              select: {
                displayName: true,
                avatarSeed: true,
                color: true
              }
            },
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

  async localDeleteConversation(conversationId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const now = new Date();
    return (tx || prisma).participant.update({
      where: { actorId_conversationId: { actorId, conversationId } },
      data: {
        hiddenAt: now,
        historyClearedAt: now
      }
    });
  }

  async updateConversationStatus(id: string, status: ConversationStatus, tx?: Prisma.TransactionClient) {
    return (tx || prisma).conversation.update({
      where: { id },
      data: { status }
    });
  }
}
