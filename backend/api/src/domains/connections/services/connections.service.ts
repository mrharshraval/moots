import { ConnectionsRepository } from "../repositories/connections.repository.js";
import { ConnectionStatus } from "@prisma/client";
import { prisma } from "../../../database/index.js";
import { ForbiddenError, NotFoundError, RateLimitError } from "../../../shared/errors/AppError.js";
import { EventBus } from "../../../shared/events/event-bus.js";

export class ConnectionsService {
  private repository: ConnectionsRepository;

  constructor() {
    this.repository = new ConnectionsRepository();
  }

  private async ensureNotGuest(actorId1: string, actorId2: string) {
    const actors = await prisma.actor.findMany({
      where: { id: { in: [actorId1, actorId2] } },
      select: { id: true, type: true }
    });

    if (actors.some(a => a.type === 'GUEST')) {
      throw new ForbiddenError("Guest users cannot send or receive connection requests.");
    }
  }

  async requestConnection(data: { senderId: string; receiverId: string; originMatchConversationId?: string }) {
    const { senderId, receiverId, originMatchConversationId } = data;

    await this.ensureNotGuest(senderId, receiverId);

    return prisma.$transaction(async (tx) => {
      const existing = await this.repository.findConnectionBetweenActors(senderId, receiverId);
      if (existing) {
        if (existing.status === ConnectionStatus.REMOVED || existing.status === ConnectionStatus.DECLINED) {
          const cooldownMs = 24 * 60 * 60 * 1000;
          if (Date.now() - existing.updatedAt.getTime() < cooldownMs) {
            throw new RateLimitError("You must wait 24 hours before re-requesting a connection.");
          }
          // Resume connection
          const connection = await this.repository.updateConnectionStatus(existing.id, ConnectionStatus.PENDING, tx);
          await EventBus.publish(tx, "connection.requested", connection.id, "Connection", {
            connectionId: connection.id,
            senderActorId: senderId,
            receiverActorId: receiverId,
          });
          return connection;
        }
        return existing;
      }

      const connection = await this.repository.createConnection(senderId, receiverId, originMatchConversationId, tx);

      await EventBus.publish(tx, "connection.requested", connection.id, "Connection", {
        connectionId: connection.id,
        senderActorId: senderId,
        receiverActorId: receiverId,
      });

      return connection;
    });
  }

  async acceptConnection(actorId1: string, actorId2: string) {
    await this.ensureNotGuest(actorId1, actorId2);

    const connection = await this.repository.findConnectionBetweenActors(actorId1, actorId2);
    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connection.id, ConnectionStatus.ACCEPTED, tx);
      await this.repository.createConversationForConnection(updatedConnection.actor1Id, updatedConnection.actor2Id, tx);

      await EventBus.publish(tx, "connection.accepted", updatedConnection.id, "Connection", {
        connectionId: updatedConnection.id,
        actorId1: updatedConnection.actor1Id,
        actorId2: updatedConnection.actor2Id,
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

    await this.ensureNotGuest(connection.actor1Id, connection.actor2Id);

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connectionId, ConnectionStatus.ACCEPTED, tx);
      await this.repository.createConversationForConnection(updatedConnection.actor1Id, updatedConnection.actor2Id, tx);

      await EventBus.publish(tx, "connection.accepted", updatedConnection.id, "Connection", {
        connectionId: updatedConnection.id,
        actorId1: updatedConnection.actor1Id,
        actorId2: updatedConnection.actor2Id,
      });

      return updatedConnection;
    });
  }

  async rejectConnection(actorId: string, partnerId: string) {
    const connection = await this.repository.findConnectionBetweenActors(actorId, partnerId);
    if (!connection || connection.status !== ConnectionStatus.PENDING) {
      throw new NotFoundError("Pending connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connection.id, ConnectionStatus.DECLINED, tx);

      await EventBus.publish(tx, "connection.rejected", updatedConnection.id, "Connection", {
        connectionId: updatedConnection.id,
        actorId1: updatedConnection.actor1Id,
        actorId2: updatedConnection.actor2Id,
      });

      return updatedConnection;
    });
  }

  async cancelConnection(actorId: string, partnerId: string) {
    const connection = await this.repository.findConnectionBetweenActors(actorId, partnerId);
    if (!connection || connection.status !== ConnectionStatus.PENDING) {
      throw new NotFoundError("Pending connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const deletedConnection = await tx.connection.delete({
        where: { id: connection.id }
      });

      await EventBus.publish(tx, "connection.cancelled", deletedConnection.id, "Connection", {
        connectionId: deletedConnection.id,
        actorId1: deletedConnection.actor1Id,
        actorId2: deletedConnection.actor2Id,
      });

      return deletedConnection;
    });
  }

  async removeConnection(actorId1: string, actorId2: string) {
    const connection = await this.repository.findConnectionBetweenActors(actorId1, actorId2);
    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedConnection = await this.repository.updateConnectionStatus(connection.id, ConnectionStatus.REMOVED, tx);

      await EventBus.publish(tx, "connection.removed", updatedConnection.id, "Connection", {
        connectionId: updatedConnection.id,
        actorId1: updatedConnection.actor1Id,
        actorId2: updatedConnection.actor2Id,
      });

      return updatedConnection;
    });
  }

  async getConnections(actorId: string, limit = 20, cursor?: string) {
    const args: any = {
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { actor1Id: actorId },
          { actor2Id: actorId }
        ]
      },
      take: limit + 1,
      orderBy: { updatedAt: 'desc' }
    };
    if (cursor) {
      args.cursor = { id: cursor };
    }
    const connections = await prisma.connection.findMany(args);
    let nextCursor: string | undefined = undefined;
    if (connections.length > limit) {
      const nextItem = connections.pop();
      nextCursor = nextItem!.id;
    }
    return { data: connections, nextCursor };
  }

  async getPendingRequests(actorId: string, limit = 20, cursor?: string) {
    const args: any = {
      where: {
        status: ConnectionStatus.PENDING,
        OR: [
          { actor1Id: actorId },
          { actor2Id: actorId }
        ]
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' }
    };
    if (cursor) {
      args.cursor = { id: cursor };
    }
    const connections = await prisma.connection.findMany(args);
    let nextCursor: string | undefined = undefined;
    if (connections.length > limit) {
      const nextItem = connections.pop();
      nextCursor = nextItem!.id;
    }
    return { data: connections, nextCursor };
  }
}

