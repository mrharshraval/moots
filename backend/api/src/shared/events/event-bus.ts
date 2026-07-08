import { Prisma } from "@prisma/client";
import { DomainEvent, DomainEventSchema } from "@moots/contracts";

export class EventBus {
  /**
   * Publishes an event to the Outbox using the current transaction.
   * This ensures that the event is committed atomically with the domain state changes.
   */
  static async publish(
    tx: Prisma.TransactionClient,
    eventType: DomainEvent["eventType"],
    aggregateId: string,
    aggregateType: string,
    payload: any
  ) {
    const event = await tx.domainEvent.create({
      data: {
        eventType,
        aggregateId,
        aggregateType,
        payload,
      },
    });

    let publishedAt: Date | null = null;

    try {
      const { resolve } = await import("../../config/container.js");
      const redisService = resolve("redisService");

      // Validate/Parse before publishing
      const parsedPayload = DomainEventSchema.parse({
        eventType: event.eventType,
        payload: event.payload,
      });

      const envelope = {
        eventId: event.id,
        eventType: event.eventType,
        version: 1,
        occurredAt: event.occurredAt.toISOString(),
        correlationId: event.id,
        payload: parsedPayload.payload,
      };

      const channel = `moots:event:${event.eventType}`;
      await redisService.client.publish(channel, JSON.stringify(envelope));
      publishedAt = new Date();
    } catch (err: any) {
      const { logger } = await import("../logger.js");
      logger.error({ err, eventId: event.id, eventType }, "[EventBus] Immediate Redis publish failed");
    }

    if (publishedAt) {
      await tx.domainEvent.update({
        where: { id: event.id },
        data: { publishedAt },
      });
    }
  }
}
