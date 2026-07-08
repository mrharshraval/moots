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

    if (events.length > 0) {
      for (const event of events) {
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
      }
      logger.debug(`Published ${events.length} domain events to Redis`);
    }

    return events.length;
  }
}
