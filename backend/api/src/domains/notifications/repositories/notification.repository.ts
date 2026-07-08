import { prisma } from "../../../database/index.js";
import { NotificationType } from "@prisma/client";

export class NotificationRepository {
  async create(data: {
    actorId: string;
    type: NotificationType;
    entityId?: string;
    idempotencyKey?: string;
    payload: any;
  }) {
    if (data.idempotencyKey) {
      // Upsert to ensure idempotency. If it already exists, do nothing or return the existing one.
      // Since prisma doesn't have a direct "insert ignore" easily without unique fields in where,
      // we can do a standard upsert. Wait, upsert requires a unique where clause.
      // Our unique clause is @@unique([actorId, idempotencyKey]).
      return prisma.notification.upsert({
        where: {
          actorId_idempotencyKey: {
            actorId: data.actorId,
            idempotencyKey: data.idempotencyKey,
          }
        },
        update: {}, // Do nothing if it exists
        create: {
          actorId: data.actorId,
          type: data.type,
          entityId: data.entityId,
          idempotencyKey: data.idempotencyKey,
          payload: data.payload,
        }
      });
    }

    return prisma.notification.create({
      data: {
        actorId: data.actorId,
        type: data.type,
        entityId: data.entityId,
        payload: data.payload,
      },
    });
  }

  async findManyByActor(actorId: string, limit: number, cursor?: string) {
    return prisma.notification.findMany({
      where: { actorId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async countUnread(actorId: string) {
    return prisma.notification.count({
      where: { actorId, isRead: false },
    });
  }

  async markAsRead(id: string, actorId: string) {
    return prisma.notification.updateMany({
      where: { id, actorId, isRead: false },
      data: { isRead: true },
    });
  }

  async markAllAsRead(actorId: string) {
    return prisma.notification.updateMany({
      where: { actorId, isRead: false },
      data: { isRead: true },
    });
  }


}
