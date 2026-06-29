import { InboundMessageSchema } from "./types.js";
import { registry } from "./registry.js";
import { matchmakingService } from "./matchmaking.js";
import { sessionService } from "./session.js";
import { structuredLog } from "./lib/logger.js";
export { structuredLog };
import crypto from "crypto";
import { wsMessagesTotal } from "./lib/metrics.js";
import { redis } from "./lib/redis.js";

export class MessagingService {
  async handleMessage(connectionId: string, rawMessage: string) {
    const conn = registry.get(connectionId);
    if (!conn) {
      console.error(`Received message for unregistered connection: ${connectionId}`);
      return;
    }

    if (!conn.rateLimiter.allow()) {
      structuredLog("RATE_LIMIT_EXCEEDED", connectionId, { details: "Client sent messages too fast" }, "warn", conn);
      conn.ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded. Please wait a moment." }));
      return;
    }

    const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11);
    let parsedMessage;

    try {
      const json = JSON.parse(rawMessage);
      const validation = InboundMessageSchema.safeParse(json);
      if (!validation.success) {
        structuredLog(
          "VALIDATION_FAILED",
          connectionId,
          { requestId, details: JSON.stringify(validation.error.format()) },
          "warn",
          conn
        );
        conn.ws.send(JSON.stringify({ type: "error", message: "Invalid message schema" }));
        return;
      }
      parsedMessage = validation.data;
    } catch (err: any) {
      structuredLog(
        "PARSE_ERROR",
        connectionId,
        { requestId, details: err.message },
        "error",
        conn
      );
      conn.ws.send(JSON.stringify({ type: "error", message: "Malformed JSON message" }));
      return;
    }

    const { type, payload } = parsedMessage;
    const actorId = conn.actorId;
    const sessionId = ("sessionId" in payload && payload.sessionId) ? payload.sessionId : "N/A";

    structuredLog(type, connectionId, { requestId, actorId, sessionId }, "info", conn);
    wsMessagesTotal.inc({ type, direction: "inbound" });

    if (!actorId) return;

    switch (type) {
      case "join-queue": {
        const { interests, lang, country, nickname, username } = payload;
        
        registry.updateMetadata(connectionId, {
          actorId,
          email: conn.email,
          sessionId: conn.sessionId,
          requestId: conn.requestId,
          connectionType: "queue",
        });

        await matchmakingService.removeUser(actorId);
        await matchmakingService.addUser(actorId, { interests, lang, country, nickname, username }, connectionId);

        const match = await matchmakingService.findMatch(actorId);
        if (match) {
          const session = sessionService.createSession(actorId, match.actorId, nickname, match.nickname, username, match.username);
          const peerConn = registry.get(match.connectionId);

          conn.ws.send(
            JSON.stringify({
              type: "match-found",
              payload: {
                sessionId: session.sessionId,
                peerId: match.actorId,
                peerNickname: match.nickname || "Stranger",
                peerUsername: match.username || null,
              },
            })
          );

          if (peerConn && peerConn.ws) {
            peerConn.ws.send(
              JSON.stringify({
                type: "match-found",
                payload: {
                  sessionId: session.sessionId,
                  peerId: actorId,
                  peerNickname: nickname || "Stranger",
                  peerUsername: username || null,
                },
              })
            );
            registry.updateMetadata(match.connectionId, { sessionId: session.sessionId, connectionType: "chat" });
          }

          registry.updateMetadata(connectionId, { sessionId: session.sessionId, connectionType: "chat" });
          session.activeConnections.set(actorId, connectionId);
          session.activeConnections.set(match.actorId, match.connectionId);
        }
        break;
      }

      case "cancel-queue": {
        await matchmakingService.removeUser(actorId);
        break;
      }

      case "join-chat": {
        const { nickname, username, sessionId } = payload;
        registry.updateMetadata(connectionId, {
          sessionId,
          connectionType: "chat",
        });

        const session = await sessionService.joinSession(
          sessionId,
          actorId,
          connectionId,
          registry,
          (partnerWs, joinedUserId) => {
            partnerWs.send(
              JSON.stringify({
                type: "partner-joined",
                payload: {
                  partnerId: joinedUserId,
                  partnerNickname: nickname || "Stranger",
                  partnerUsername: username || null,
                },
              })
            );
          }
        );

        if (session) {
          if (!session.nicknames) session.nicknames = {};
          if (!session.usernames) session.usernames = {};
          if (nickname) session.nicknames[actorId] = nickname;
          if (username) session.usernames[actorId] = username;

          const partnerId = session.users.find((id) => id !== actorId);
          const partnerNickname = partnerId ? (session.nicknames ? session.nicknames[partnerId] : "Stranger") : "Stranger";
          const partnerUsername = partnerId ? (session.usernames ? session.usernames[partnerId] : null) : null;
          conn.ws.send(
            JSON.stringify({
              type: "chat-history",
              payload: {
                messages: session.messages,
                partnerJoined: partnerId ? session.activeConnections.has(partnerId) : false,
                partnerNickname: partnerNickname || "Stranger",
                partnerUsername: partnerUsername || null,
              },
            })
          );
        }
        break;
      }

      case "read-messages": {
        const { sessionId } = payload;
        redis.lpush("moots:command:mark_read", JSON.stringify({ conversationId: sessionId, actorId })).catch((err: any) => {
          structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
        });
        break;
      }

      case "send-message": {
        const { sessionId, content, replyTo } = payload;
        redis.lpush("moots:command:send_message", JSON.stringify({
          conversationId: sessionId,
          senderParticipantId: actorId,
          content,
          clientMessageId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
          replyToId: replyTo?.id,
        })).catch((err: any) => {
          structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
        });
        break;
      }

      case "edit-message": {
        const { sessionId, messageId, newContent } = payload;
        redis.lpush("moots:command:edit_message", JSON.stringify({
          messageId,
          newContent,
        })).catch((err: any) => {
          structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
        });
        break;
      }

      case "send-reaction": {
        const { sessionId, messageId, emoji } = payload;
        redis.lpush("moots:command:send_reaction", JSON.stringify({
          messageId,
          emoji,
          actorId,
        })).catch((err: any) => {
          structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
        });
        break;
      }

      case "typing-status": {
        const { sessionId, isTyping } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          const partnerConnId = session.activeConnections.get(partnerId);
          if (partnerConnId) {
            const partnerConn = registry.get(partnerConnId);
            if (partnerConn && partnerConn.ws) {
              partnerConn.ws.send(
                JSON.stringify({
                  type: "partner-typing",
                  payload: { isTyping },
                })
              );
            }
          }
        }
        break;
      }

      case "connection:request": {
        const { sessionId } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          redis.lpush("moots:command:connection_request", JSON.stringify({
            actorId1: actorId,
            actorId2: partnerId,
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }

      case "connection:accepted": {
        const { sessionId } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          redis.lpush("moots:command:connection_accept", JSON.stringify({
            actorId,
            id: partnerId,
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }

      case "connection:removed": {
        const { sessionId } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          redis.lpush("moots:command:connection_remove", JSON.stringify({
            actorId,
            id: partnerId,
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }

      case "participant:identity-revealed": {
        const { sessionId } = payload;
        redis.lpush("moots:command:identity_reveal", JSON.stringify({
          id: sessionId,
          actorId,
        })).catch((err: any) => {
          structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
        });
        break;
      }

      case "participant:identity-hidden": {
        const { sessionId } = payload;
        sessionService.broadcast(sessionId, parsedMessage, registry, [actorId]);
        break;
      }
    }
  }
}
export const messagingService = new MessagingService();
