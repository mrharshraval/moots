import { InboundMessageSchema } from "./types.js";
import { registry } from "./registry.js";
import { matchmakingService } from "./matchmaking.js";
import { sessionService } from "./session.js";

// Helper to construct log strings with structured metadata
function structuredLog(event, connectionId, metadata = {}, level = "info") {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  const reqId = metadata.requestId || "N/A";
  const userId = metadata.userId || "N/A";
  const sessionId = metadata.sessionId || "N/A";
  const prefix = `[${ts}] [WS Server] [Req: ${reqId}] [Conn: ${connectionId}] [User: ${userId}] [Session: ${sessionId}] [Event: ${event}]`;

  const details = metadata.details ? ` | Details: ${metadata.details}` : "";
  const message = `${prefix}${details}`;

  if (level === "warn") {
    console.warn(`⚠️  ${message}`);
  } else if (level === "error") {
    console.error(`❌  ${message}`);
  } else {
    console.log(`🟢  ${message}`);
  }
}

export class MessagingService {
  handleMessage(connectionId, rawMessage) {
    const conn = registry.get(connectionId);
    if (!conn) {
      console.error(`Received message for unregistered connection: ${connectionId}`);
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
          "warn"
        );
        conn.ws.send(JSON.stringify({ type: "error", message: "Invalid message schema" }));
        return;
      }
      parsedMessage = validation.data;
    } catch (err) {
      structuredLog(
        "PARSE_ERROR",
        connectionId,
        { requestId, details: err.message },
        "error"
      );
      conn.ws.send(JSON.stringify({ type: "error", message: "Malformed JSON message" }));
      return;
    }

    const { type, payload } = parsedMessage;
    const userId = payload.userId;
    const sessionId = payload.sessionId || "N/A";

    structuredLog(type, connectionId, { requestId, userId, sessionId });

    switch (type) {
      case "join-queue": {
        const { interests, lang, country } = payload;
        
        // Update connection type & metadata
        registry.updateMetadata(connectionId, {
          userId,
          connectionType: "queue",
        });

        // Cancel/remove user from matchmaking if they were in it previously
        matchmakingService.removeUser(userId);

        // Add to queue
        matchmakingService.addUser(userId, { interests, lang, country }, connectionId);

        // Try to match
        const match = matchmakingService.findMatch(userId);
        if (match) {
          const session = sessionService.createSession(userId, match.userId);

          // Get socket for the peer
          const peerConn = registry.get(match.connectionId);

          // Return sessionId to both users
          conn.ws.send(
            JSON.stringify({
              type: "match-found",
              payload: { sessionId: session.sessionId, peerId: match.userId },
            })
          );

          if (peerConn && peerConn.ws) {
            peerConn.ws.send(
              JSON.stringify({
                type: "match-found",
                payload: { sessionId: session.sessionId, peerId: userId },
              })
            );
          }

          structuredLog("MATCH_FOUND", connectionId, {
            requestId,
            userId,
            sessionId: session.sessionId,
            details: `Matched with user ${match.userId}`,
          });
        } else {
          conn.ws.send(JSON.stringify({ type: "waiting", payload: {} }));
        }
        break;
      }

      case "cancel-queue": {
        matchmakingService.removeUser(userId);
        break;
      }

      case "join-chat": {
        registry.updateMetadata(connectionId, {
          userId,
          sessionId,
          connectionType: "chat",
        });

        const session = sessionService.joinSession(
          sessionId,
          userId,
          connectionId,
          registry,
          // Callback when partner is notified of joining
          (partnerWs, joinedUserId) => {
            partnerWs.send(
              JSON.stringify({
                type: "partner-joined",
                payload: { partnerId: joinedUserId },
              })
            );
          }
        );

        // Send chat history to user
        const partnerId = session.users.find((id) => id !== userId);
        conn.ws.send(
          JSON.stringify({
            type: "chat-history",
            payload: {
              messages: session.messages,
              partnerJoined: partnerId ? session.activeConnections.has(partnerId) : false,
            },
          })
        );
        break;
      }

      case "read-messages": {
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        let updated = false;
        session.messages.forEach((m) => {
          if (m.senderId !== userId && !m.seen) {
            m.seen = true;
            updated = true;
          }
        });

        if (updated) {
          const partnerId = session.users.find((id) => id !== userId);
          if (partnerId) {
            const partnerConnId = session.activeConnections.get(partnerId);
            if (partnerConnId) {
              const partnerConn = registry.get(partnerConnId);
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
        }
        break;
      }

      case "send-message": {
        const { content, replyTo } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const msg = {
          id: Date.now().toString(),
          senderId: userId,
          content,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: {}, // emoji -> userIds[]
          seen: false,
          replyTo: replyTo
            ? {
                id: replyTo.id,
                senderId: replyTo.senderId,
                content: replyTo.content,
              }
            : undefined,
        };

        session.messages.push(msg);

        // Broadcast to both session users
        sessionService.broadcast(sessionId, { type: "message", payload: msg }, registry);
        break;
      }

      case "edit-message": {
        const { messageId, newContent } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const msg = session.messages.find((m) => m.id === messageId);
        if (msg && msg.senderId === userId) {
          msg.content = newContent;
          msg.edited = true;

          // Broadcast edit update
          sessionService.broadcast(
            sessionId,
            {
              type: "message-edited",
              payload: { messageId, content: newContent, edited: true },
            },
            registry
          );
        }
        break;
      }

      case "send-reaction": {
        const { messageId, emoji } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const msg = session.messages.find((m) => m.id === messageId);
        if (msg) {
          msg.reactions = msg.reactions || {};

          // Remove user from other reactions on this message
          for (const key in msg.reactions) {
            if (key !== emoji) {
              msg.reactions[key] = msg.reactions[key].filter((id) => id !== userId);
              if (msg.reactions[key].length === 0) {
                delete msg.reactions[key];
              }
            }
          }

          // Toggle reaction
          const list = msg.reactions[emoji] || [];
          const exists = list.includes(userId);
          msg.reactions[emoji] = exists ? list.filter((id) => id !== userId) : [...list, userId];

          if (msg.reactions[emoji].length === 0) {
            delete msg.reactions[emoji];
          }

          // Broadcast update
          sessionService.broadcast(
            sessionId,
            {
              type: "reaction-update",
              payload: { messageId, reactions: msg.reactions },
            },
            registry
          );
        }
        break;
      }

      case "typing-status": {
        const { isTyping } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== userId);
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
    }
  }
}
export const messagingService = new MessagingService();
export { structuredLog };
