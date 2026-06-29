import { redisSub } from "./lib/redis.js";
import { registry } from "./registry.js";
import { sessionService } from "./session.js";
import { logger } from "./lib/logger.js";

export function initializeEventListener() {
  logger.info("Initializing Redis Pub/Sub Event Listener...");

  redisSub.psubscribe("moots:event:*", (err) => {
    if (err) {
      logger.error({ err }, "Failed to subscribe to moots:event:*");
    } else {
      logger.info("Subscribed to moots:event:*");
    }
  });

  redisSub.on("pmessage", (pattern, channel, message) => {
    try {
      const envelope = JSON.parse(message);
      const { eventType, payload } = envelope;

      logger.debug({ eventType, channel }, "Received Pub/Sub Event");

      switch (eventType) {
        case "message.sent": {
          const { id, conversationId, senderParticipantId, content, createdAt, replyToId } = payload;
          const session = sessionService.getSession(conversationId);
          
          const wsMsg = {
            id,
            senderId: senderParticipantId,
            content,
            time: createdAt,
            reactions: {} as Record<string, string[]>,
            seen: false,
            replyTo: replyToId ? { id: replyToId } : undefined,
          };

          if (session) {
            session.messages.push(wsMsg);
          }

          sessionService.broadcast(conversationId, {
            type: "message",
            payload: wsMsg,
          }, registry);
          break;
        }

        case "message.edited": {
          const { messageId, conversationId, content } = payload;
          const session = sessionService.getSession(conversationId);

          if (session) {
            const msg = session.messages.find((m: any) => m.id === messageId);
            if (msg) {
              msg.content = content;
              msg.edited = true;
            }
          }

          sessionService.broadcast(conversationId, {
            type: "message-edited",
            payload: { messageId, content, edited: true },
          }, registry);
          break;
        }

        case "reaction.updated": {
          const { messageId, conversationId, reactions } = payload;
          const session = sessionService.getSession(conversationId);

          if (session) {
            const msg = session.messages.find((m: any) => m.id === messageId);
            if (msg) {
              msg.reactions = reactions;
            }
          }

          sessionService.broadcast(conversationId, {
            type: "reaction-update",
            payload: { messageId, reactions },
          }, registry);
          break;
        }

        case "participant.read": {
          const { conversationId, actorId } = payload;
          const session = sessionService.getSession(conversationId);

          if (session) {
            session.messages.forEach((m: any) => {
              if (m.senderId !== actorId && !m.seen) {
                m.seen = true;
              }
            });

            const partnerId = session.users.find((id) => id !== actorId);
            if (partnerId) {
              const partnerConn = registry.getConnectionByActorId(partnerId, "chat");
              if (partnerConn && partnerConn.ws) {
                partnerConn.ws.send(
                  JSON.stringify({
                    type: "partner-seen-messages",
                    payload: {},
                  })
                );
              }
            }
          }
          break;
        }

        case "connection.requested": {
          const { connectionId, senderActorId, receiverActorId } = payload;
          const conn = registry.getConnectionByActorId(receiverActorId);
          if (conn && conn.ws) {
            conn.ws.send(
              JSON.stringify({
                type: "connection:request",
                payload: {
                  connectionId,
                  senderId: senderActorId,
                },
              })
            );
          }
          break;
        }

        case "connection.accepted": {
          const { connectionId, actorId1, actorId2 } = payload;
          // Notify both users if they are online
          [actorId1, actorId2].forEach((actorId) => {
            const conn = registry.getConnectionByActorId(actorId);
            if (conn && conn.ws) {
              conn.ws.send(
                JSON.stringify({
                  type: "connection:accepted",
                  payload: {
                    connectionId,
                  },
                })
              );
            }
          });
          break;
        }

        case "connection.removed": {
          const { connectionId, actorId1, actorId2 } = payload;
          [actorId1, actorId2].forEach((actorId) => {
            const conn = registry.getConnectionByActorId(actorId);
            if (conn && conn.ws) {
              conn.ws.send(
                JSON.stringify({
                  type: "connection:removed",
                  payload: {
                    connectionId,
                  },
                })
              );
            }
          });
          break;
        }

        case "identity.reveal_confirmed": {
          const { conversationId, actorId } = payload;
          const session = sessionService.getSession(conversationId);
          if (session) {
            const partnerId = session.users.find((id) => id !== actorId);
            if (partnerId) {
              const conn = registry.getConnectionByActorId(partnerId, "chat");
              if (conn && conn.ws) {
                conn.ws.send(
                  JSON.stringify({
                    type: "participant:identity-revealed",
                    payload: {
                      sessionId: conversationId,
                      actorId,
                    },
                  })
                );
              }
            }
          }
          break;
        }
      }
    } catch (err: any) {
      logger.error({ err, message }, "Error parsing or handling Pub/Sub message");
    }
  });
}
