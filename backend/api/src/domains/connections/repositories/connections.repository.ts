import { prisma } from "../../../database/index.js";
import { Connection, ConnectionStatus, Prisma } from "@prisma/client"; 

export class ConnectionsRepository {
  async findConnectionBetweenActors(actorId1: string, actorId2: string): Promise<Connection | null> {
    return prisma.connection.findFirst({
      where: {
        OR: [
          { actor1Id: actorId1, actor2Id: actorId2 },
          { actor1Id: actorId2, actor2Id: actorId1 }
        ]
      }
    });
  }

  async createConnection(senderActorId: string, receiverActorId: string, originMatchConversationId?: string, tx?: Prisma.TransactionClient): Promise<Connection> {
    const [id1, id2] = senderActorId < receiverActorId 
      ? [senderActorId, receiverActorId] 
      : [receiverActorId, senderActorId];
      
    return (tx || prisma).connection.create({
      data: { 
        actor1Id: id1, 
        actor2Id: id2, 
        status: ConnectionStatus.PENDING,
        originMatchConversationId 
      }
    });
  }

  async updateConnectionStatus(id: string, status: ConnectionStatus, tx?: Prisma.TransactionClient): Promise<Connection> {
    return (tx || prisma).connection.update({
      where: { id },
      data: { status, respondedAt: new Date() }
    });
  }

  async createConversationForConnection(actor1Id: string, actor2Id: string, tx?: Prisma.TransactionClient) {
    const trx = tx || prisma;
    
    // Search for an existing FRIEND conversation between these two actors
    const existingConversation = await trx.conversation.findFirst({
      where: {
        kind: 'FRIEND',
        type: 'DIRECT',
        AND: [
          { participants: { some: { actorId: actor1Id } } },
          { participants: { some: { actorId: actor2Id } } }
        ]
      },
      include: {
        participants: true
      }
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create a new FRIEND conversation
    return trx.conversation.create({
      data: {
        kind: 'FRIEND',
        type: 'DIRECT',
        policyId: 'policy_identified_dm_v1',
        status: 'ACTIVE',
        participants: {
          create: [
            { actorId: actor1Id },
            { actorId: actor2Id }
          ]
        }
      },
      include: {
        participants: true
      }
    });
  }
}
