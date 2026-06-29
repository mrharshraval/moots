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

  async createConnection(senderActorId: string, receiverActorId: string, tx?: Prisma.TransactionClient): Promise<Connection> {
    return (tx || prisma).connection.create({
      data: { actor1Id: senderActorId, actor2Id: receiverActorId, status: ConnectionStatus.PENDING }
    });
  }

  async updateConnectionStatus(id: string, status: ConnectionStatus, tx?: Prisma.TransactionClient): Promise<Connection> {
    return (tx || prisma).connection.update({
      where: { id },
      data: { status }
    });
  }

  async createConversationForConnection(actor1Id: string, actor2Id: string, tx?: Prisma.TransactionClient) {
    const trx = tx || prisma;
    return trx.conversation.create({
      data: {
        type: 'DIRECT',
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
