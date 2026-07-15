import { prisma } from "../../database/index.js";
import { resolve } from "../../config/container.js";
import { logger } from "../logger.js";
import { DomainEventSchema } from "@moots/contracts";

export class OutboxService {
  async processOutbox(): Promise<number> {
    const redisService = resolve("redisService");

    // Find unpublished events
    const events = await prisma.domainEvent.findMany({
      where: { publishedAt: null },
      orderBy: { occurredAt: "asc" },
      take: 50,
    });

    let published = 0;

    for (const event of events) {
      try {
        // Enforce strong typing even when publishing out
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

        // Mark as published
        await prisma.domainEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });

        published++;
      } catch (err: any) {
        // Log the bad event and mark it as published (dead-letter) so it
        // doesn't poison the queue and block all subsequent events.
        logger.error({ err, eventId: event.id, eventType: event.eventType }, "Outbox: failed to process event, dead-lettering");
        await prisma.domainEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      }
    }

    if (published > 0) {
      logger.debug(`Published ${published} domain events to Redis`);
    }

    return events.length;
  }
}
