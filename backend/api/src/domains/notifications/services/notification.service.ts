import { NotificationRepository } from "../repositories/notification.repository.js";
import { EventBus } from "../../../shared/events/event-bus.js";
import { NotificationType } from "@prisma/client";
import { prisma } from "../../../database/index.js";
import crypto from "crypto";

export class NotificationService {
  private repository: NotificationRepository;

  constructor() {
    this.repository = new NotificationRepository();
  }

  async createNotification(
    actorId: string,
    type: NotificationType,
    entityId: string | undefined,
    payload: any,
    reqId?: string,
    idempotencyKey?: string
  ) {
    const notification = await prisma.$transaction(async (tx) => {
      const notif = await tx.notification.upsert({
        where: {
          actorId_idempotencyKey: {
            actorId,
            idempotencyKey: idempotencyKey || crypto.randomUUID(), // Fallback if no idempotency key
          }
        },
        update: {},
        create: {
          actorId,
          type,
          entityId,
          idempotencyKey,
          payload,
        }
      });

      await EventBus.publish(
        tx,
        "notification.created",
        notif.id,
        "Notification",
        {
          id: notif.id,
          actorId: notif.actorId,
          type: notif.type,
          entityId: notif.entityId,
          payload: notif.payload,
          createdAt: notif.createdAt.toISOString(),
        }
      );

      return notif;
    });

    return notification;
  }

  async getNotifications(actorId: string, limit: number, cursor?: string) {
    const notifications = await this.repository.findManyByActor(actorId, limit + 1, cursor);
    let nextCursor: string | undefined;

    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem?.id;
    }

    const unreadCount = await this.repository.countUnread(actorId);

    return {
      notifications,
      nextCursor,
      unreadCount,
    };
  }

  async getUnreadCount(actorId: string) {
    return this.repository.countUnread(actorId);
  }

  async markAsRead(id: string, actorId: string) {
    await this.repository.markAsRead(id, actorId);
  }

  async markAllAsRead(actorId: string) {
    await this.repository.markAllAsRead(actorId);
  }
}
