import { logger } from "../../shared/logger.js";
import { OutboxService } from "../../shared/events/outbox.service.js";

const POLL_INTERVAL_MS = 100;    // idle poll: 100ms
const MIN_BACKOFF_MS = 1_000;  // first retry after error
const MAX_BACKOFF_MS = 30_000; // cap at 30s

let running = false;
let timeoutId: NodeJS.Timeout | null = null;
let backoffMs = 0; // 0 = no error, use normal poll interval

const outboxService = new OutboxService();

export async function processOutbox() {
  if (running) return;
  running = true;

  let processedCount = 0;
  try {
    processedCount = await outboxService.processOutbox();
    // Success — reset backoff
    backoffMs = 0;
  } catch (err: any) {
    logger.error({ err }, "Error processing outbox events");
    // Exponential backoff on error
    backoffMs = backoffMs === 0 ? MIN_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  } finally {
    running = false;
    // If we processed events, check again very quickly (10ms) to ensure low latency
    const delay = backoffMs > 0
      ? backoffMs
      : (processedCount > 0 ? 10 : POLL_INTERVAL_MS);
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
