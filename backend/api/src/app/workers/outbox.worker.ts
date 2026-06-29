import { prisma } from "../../database/index.js";
import { resolve } from "../../config/container.js";
import { logger } from "../../shared/logger.js";

const POLL_INTERVAL_MS = 2_000;   // idle poll: 2s
const MIN_BACKOFF_MS   = 2_000;   // first retry after error
const MAX_BACKOFF_MS   = 60_000;  // cap at 60s

let running    = false;
let timeoutId: NodeJS.Timeout | null = null;
let backoffMs  = 0; // 0 = no error, use normal poll interval

export async function processOutbox() {
  if (running) return;
  running = true;

  try {
    const redisService = resolve("redisService");

    // Find unpublished events
    const events = await prisma.domainEvent.findMany({
      where: { publishedAt: null },
      orderBy: { occurredAt: "asc" },
      take: 50,
    });

    if (events.length > 0) {
      for (const event of events) {
        const envelope = {
          eventId: event.id,
          eventType: event.eventType,
          version: 1,
          occurredAt: event.occurredAt.toISOString(),
          correlationId: event.id,
          payload: event.payload,
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

    // Success — reset backoff
    backoffMs = 0;
  } catch (err: any) {
    logger.error({ err }, "Error processing outbox events");
    // Exponential backoff on error
    backoffMs = backoffMs === 0 ? MIN_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  } finally {
    running = false;
    const delay = backoffMs > 0 ? backoffMs : POLL_INTERVAL_MS;
    timeoutId = setTimeout(processOutbox, delay);
  }
}

export function startOutboxWorker() {
  logger.info("Starting Outbox Worker...");
  processOutbox();
}

export function stopOutboxWorker() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  logger.info("Stopped Outbox Worker.");
}
