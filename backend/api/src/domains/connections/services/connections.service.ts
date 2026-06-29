import { ConnectionsRepository } from "../repositories/connections.repository.js";
import { ConnectionStatus } from "@prisma/client";
import { prisma } from "../../../database/index.js";
import { ForbiddenError, NotFoundError } from "../../../shared/errors/AppError.js";

export class ConnectionsService {
  private repository: ConnectionsRepository;

  constructor() {
    this.repository = new ConnectionsRepository();
  }

  async requestConnection(data: { senderId: string; receiverId: string }) {
    const { senderId, receiverId } = data;

    return prisma.$transaction(async (tx) => {
      const existing = await this.repository.findConnectionBetweenActors(senderId, receiverId);
      if (existing) {
        return existing;
      }

      const connection = await this.repository.createConnection(senderId, receiverId, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "connection.requested",
          aggregateId: connection.id,
          aggregateType: "Connection",
          payload: {
            connectionId: connection.id,
            actor1Id: connection.actor1Id,
            actor2Id: connection.actor2Id,
            status: connection.status,
            senderActorId: senderId,
            receiverActorId: receiverId,
          }
        }
      });

      return connection;
    });
  }

  async acceptConnection(actorId1: string, actorId2: string) {
    const connection = await this.repository.findConnectionBetweenActors(actorId1, actorId2);
    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connection.id, ConnectionStatus.ACCEPTED, tx);
      await this.repository.createConversationForConnection(updatedConnection.actor1Id, updatedConnection.actor2Id, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "connection.accepted",
          aggregateId: updatedConnection.id,
          aggregateType: "Connection",
          payload: {
            connectionId: updatedConnection.id,
            actor1Id: updatedConnection.actor1Id,
            actor2Id: updatedConnection.actor2Id,
            status: updatedConnection.status,
          }
        }
      });

      return updatedConnection;
    });
  }

  async acceptConnectionById(connectionId: string, actorId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    if (actorId !== connection.actor2Id) {
      throw new ForbiddenError("You are not authorized to accept this connection");
    }

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connectionId, ConnectionStatus.ACCEPTED, tx);
      await this.repository.createConversationForConnection(updatedConnection.actor1Id, updatedConnection.actor2Id, tx);

      await tx.domainEvent.create({
        data: {
          eventType: "connection.accepted",
          aggregateId: updatedConnection.id,
          aggregateType: "Connection",
          payload: {
            connectionId: updatedConnection.id,
            actor1Id: updatedConnection.actor1Id,
            actor2Id: updatedConnection.actor2Id,
            status: updatedConnection.status,
          }
        }
      });

      return updatedConnection;
    });
  }

  async removeConnection(actorId1: string, actorId2: string) {
    const connection = await this.repository.findConnectionBetweenActors(actorId1, actorId2);
    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const deletedConnection = await tx.connection.delete({
        where: { id: connection.id }
      });

      await tx.domainEvent.create({
        data: {
          eventType: "connection.removed",
          aggregateId: deletedConnection.id,
          aggregateType: "Connection",
          payload: {
            connectionId: deletedConnection.id,
            actor1Id: deletedConnection.actor1Id,
            actor2Id: deletedConnection.actor2Id,
          }
        }
      });

      return deletedConnection;
    });
  }
}
