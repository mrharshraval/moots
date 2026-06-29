import { resolve } from "../../config/container.js";
import { logger } from "../../shared/logger.js";

const POLL_INTERVAL_MS = 1_000;   // idle poll: 1s
const MIN_BACKOFF_MS   = 2_000;   // first retry after error
const MAX_BACKOFF_MS   = 60_000;  // cap at 60s

let running   = false;
let timeoutId: NodeJS.Timeout | null = null;
let backoffMs = 0; // 0 = no error, use normal poll interval

export async function processCommands() {
  if (running) return;
  running = true;

  try {
    const redisService = resolve("redisService");
    const client = redisService.client;

    // 1. send_message
    let cmd = await client.rpop("moots:command:send_message");
    while (cmd) {
      const data = JSON.parse(cmd);
      const messagesService = resolve("messagesService");
      await messagesService.sendMessage(data);
      cmd = await client.rpop("moots:command:send_message");
    }

    // 2. edit_message
    cmd = await client.rpop("moots:command:edit_message");
    while (cmd) {
      const { messageId, newContent } = JSON.parse(cmd);
      const messagesService = resolve("messagesService");
      await messagesService.editMessage(messageId, newContent);
      cmd = await client.rpop("moots:command:edit_message");
    }

    // 3. send_reaction
    cmd = await client.rpop("moots:command:send_reaction");
    while (cmd) {
      const { messageId, emoji, actorId } = JSON.parse(cmd);
      const messagesService = resolve("messagesService");
      await messagesService.toggleReaction(messageId, emoji, actorId);
      cmd = await client.rpop("moots:command:send_reaction");
    }

    // 4. mark_read
    cmd = await client.rpop("moots:command:mark_read");
    while (cmd) {
      const { conversationId, actorId } = JSON.parse(cmd);
      const { prisma } = await import("../../database/index.js");
      await prisma.$transaction(async (tx) => {
        await tx.participant.update({
          where: { actorId_conversationId: { actorId, conversationId } },
          data: { unreadCount: 0 }
        });
        await tx.domainEvent.create({
          data: {
            eventType: "participant.read",
            aggregateId: conversationId,
            aggregateType: "Conversation",
            payload: { conversationId, actorId }
          }
        });
      });
      cmd = await client.rpop("moots:command:mark_read");
    }

    // 5. connection_request
    cmd = await client.rpop("moots:command:connection_request");
    while (cmd) {
      const { actorId1, actorId2 } = JSON.parse(cmd);
      const connectionsService = resolve("connectionsService");
      await connectionsService.requestConnection({ senderId: actorId1, receiverId: actorId2 });
      cmd = await client.rpop("moots:command:connection_request");
    }

    // 6. connection_accept
    cmd = await client.rpop("moots:command:connection_accept");
    while (cmd) {
      const { actorId, id } = JSON.parse(cmd);
      const connectionsService = resolve("connectionsService");
      await connectionsService.acceptConnection(actorId, id);
      cmd = await client.rpop("moots:command:connection_accept");
    }

    // 7. connection_remove
    cmd = await client.rpop("moots:command:connection_remove");
    while (cmd) {
      const { actorId, id } = JSON.parse(cmd);
      const connectionsService = resolve("connectionsService");
      await connectionsService.removeConnection(actorId, id);
      cmd = await client.rpop("moots:command:connection_remove");
    }

    // 8. identity_reveal
    cmd = await client.rpop("moots:command:identity_reveal");
    while (cmd) {
      const { id, actorId } = JSON.parse(cmd);
      const { prisma } = await import("../../database/index.js");
      await prisma.$transaction(async (tx) => {
        await tx.participant.update({
          where: { actorId_conversationId: { actorId, conversationId: id } },
          data: { identityState: "REVEALED" }
        });
        await tx.domainEvent.create({
          data: {
            eventType: "identity.reveal_confirmed",
            aggregateId: id,
            aggregateType: "Conversation",
            payload: { conversationId: id, actorId }
          }
        });
      });
      cmd = await client.rpop("moots:command:identity_reveal");
    }

    // 9. audit_log
    cmd = await client.rpop("moots:command:audit_log");
    while (cmd) {
      const { actorId, event, metadata, ip } = JSON.parse(cmd);
      const { prisma } = await import("../../database/index.js");
      await prisma.auditLog.create({
        data: {
          actorId,
          event,
          metadata: metadata || {},
          ip,
        }
      });
      cmd = await client.rpop("moots:command:audit_log");
    }

    // Success — reset backoff
    backoffMs = 0;

  } catch (err: any) {
    logger.error({ err }, "Error processing command queue");
    // Exponential backoff on error
    backoffMs = backoffMs === 0 ? MIN_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  } finally {
    running = false;
    const delay = backoffMs > 0 ? backoffMs : POLL_INTERVAL_MS;
    timeoutId = setTimeout(processCommands, delay);
  }
}

export function startCommandWorker() {
  logger.info("Starting Redis Command Worker...");
  processCommands();
}

export function stopCommandWorker() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  logger.info("Stopped Redis Command Worker.");
}
