import { registry, ConnectionMetadata } from "../registry/registry.js";
import { matchmakingService } from "../matchmaking/matchmaking.js";
import { sessionService } from "../rooms/session.js";
import { structuredLog } from "../../lib/logger.js";
import { redis } from "../../lib/redis.js";
import crypto from "crypto";
import { verifyToken } from "../auth/auth.js";
import { env } from "../../env.js";

async function callInternalApi(endpoint: string, body: any, requestId: string) {
  const url = `${env.API_URL}${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": env.INTERNAL_SERVICE_KEY,
      "X-Request-ID": requestId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Internal API call to ${endpoint} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function handleParsedMessage(
  connectionId: string, 
  type: string, 
  payload: any, 
  conn: ConnectionMetadata,
  requestId: string
) {
  const actorId = conn.actorId;
  const sessionId = ("sessionId" in payload && payload.sessionId) ? payload.sessionId : "N/A";

  try {
    switch (type) {
      case "authenticate": {
        try {
          const decodedUser = verifyToken(payload.token);
          const newActorId = decodedUser.actorId || null;
          const newEmail = (decodedUser as any).email || null;
          
          registry.updateMetadata(connectionId, {
            actorId: newActorId,
            email: newEmail,
          });

          if (newActorId) {
            redis.sadd("moots:presence:online", newActorId).catch((err: any) => {
              structuredLog("REDIS_PRESENCE_ERROR", connectionId, { details: err.message }, "error", conn);
            });
          }
          
          conn.ws.send(JSON.stringify({ type: "authenticated", payload: { actorId: newActorId } }));
        } catch (err: any) {
          structuredLog("WS_AUTH_FAILURE", connectionId, { details: err.message }, "warn", conn);
          conn.ws.close(4001, "Unauthorized");
        }
        break;
      }

      case "join-queue": {
        if (!actorId) return;
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
          redis.lpush("moots:command:provision_conversation", JSON.stringify({
            actorId1: actorId,
            actorId2: match.actorId,
            policyId: "policy_anon_stranger_v1",
            metadata: {
              actor1: { nickname, username, connectionId },
              actor2: { nickname: match.nickname, username: match.username, connectionId: match.connectionId }
            }
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }

      case "cancel-queue": {
        if (!actorId) return;
        await matchmakingService.removeUser(actorId);
        break;
      }

      case "join-chat": {
        if (!actorId) return;
        const { nickname, username, sessionId, lastMessageId } = payload;
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

          let messagesToSend = session.messages;
          if (lastMessageId) {
            const index = messagesToSend.findIndex((m: any) => m.id === lastMessageId);
            if (index !== -1) {
              messagesToSend = messagesToSend.slice(index + 1);
            }
          }

          const partnerId = session.users.find((id) => id !== actorId);
          const partnerNickname = partnerId ? (session.nicknames ? session.nicknames[partnerId] : "Stranger") : "Stranger";
          const partnerUsername = partnerId ? (session.usernames ? session.usernames[partnerId] : null) : null;
          conn.ws.send(
            JSON.stringify({
              type: "chat-history",
              payload: {
                messages: messagesToSend,
                partnerJoined: partnerId ? session.activeConnections.has(partnerId) : false,
                partnerNickname: partnerNickname || "Stranger",
                partnerUsername: partnerUsername || null,
                selfId: actorId,
                partnerId: partnerId || null,
              },
            })
          );
        }
        break;
      }

      case "read-messages": {
        if (!actorId) return;
        const { sessionId } = payload;
        callInternalApi("/internal/v1/messages/read", {
          conversationId: sessionId,
          actorId,
        }, requestId).catch((err: any) => {
          structuredLog("INTERNAL_API_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
        });
        break;
      }

      case "send-message": {
        if (!actorId) return;
        const { sessionId, content, replyTo, clientMessageId } = payload;
        const finalClientMessageId = clientMessageId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11));

        callInternalApi("/internal/v1/messages", {
          conversationId: sessionId,
          senderParticipantId: actorId,
          content,
          clientMessageId: finalClientMessageId,
          replyToId: replyTo?.id,
        }, requestId).catch((err: any) => {
          structuredLog("INTERNAL_API_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
        });
        break;
      }

      case "edit-message": {
        if (!actorId) return;
        const { sessionId, messageId, newContent } = payload;
        callInternalApi(`/internal/v1/messages/${messageId}/edit`, {
          newContent,
          actorId,
        }, requestId).catch((err: any) => {
          structuredLog("INTERNAL_API_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
        });
        break;
      }

      case "send-reaction": {
        if (!actorId) return;
        const { sessionId, messageId, emoji } = payload;
        callInternalApi(`/internal/v1/messages/${messageId}/reaction`, {
          emoji,
          actorId,
        }, requestId).catch((err: any) => {
          structuredLog("INTERNAL_API_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
        });
        break;
      }

      case "delete-message": {
        if (!actorId) return;
        const { sessionId, messageId } = payload;
        callInternalApi(`/internal/v1/messages/${messageId}/delete`, {
          actorId,
        }, requestId).catch((err: any) => {
          structuredLog("INTERNAL_API_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
        });
        break;
      }


      case "typing-status": {
        if (!actorId) return;
        const { sessionId, isTyping } = payload;
        
        sessionService.broadcast(sessionId, {
          type: "partner-typing",
          payload: { actorId, isTyping }
        }, registry, [actorId]);
        
        break;
      }

      case "connection:request": {
        if (!actorId) return;
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
        if (!actorId) return;
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
        if (!actorId) return;
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

      case "connection:reject": {
        if (!actorId) return;
        const { sessionId } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          redis.lpush("moots:command:connection_reject", JSON.stringify({
            actorId,
            id: partnerId,
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }

      case "connection:cancel": {
        if (!actorId) return;
        const { sessionId } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;

        const partnerId = session.users.find((id) => id !== actorId);
        if (partnerId) {
          redis.lpush("moots:command:connection_cancel", JSON.stringify({
            actorId,
            id: partnerId,
          })).catch((err: any) => {
            structuredLog("REDIS_COMMAND_QUEUE_ERROR", connectionId, { details: err.message }, "error", conn);
          });
        }
        break;
      }


      case "webrtc:offer":
      case "webrtc:answer":
      case "webrtc:ice-candidate": {
        if (!actorId) return;
        const { sessionId, callId, targetActorId, offer, answer, candidate } = payload;
        const session = sessionService.getSession(sessionId);
        if (!session) return;
        
        const targetConnId = session.activeConnections.get(targetActorId);
        if (targetConnId) {
          const targetConn = registry.get(targetConnId);
          if (targetConn && targetConn.ws) {
            targetConn.ws.send(
              JSON.stringify({
                type,
                payload: {
                  sessionId,
                  callId,
                  senderId: actorId,
                  ...(offer && { offer }),
                  ...(answer && { answer }),
                  ...(candidate && { candidate }),
                }
              })
            );
          }
        }
        break;
      }
    }
  } catch (err: any) {
    structuredLog("WS_MESSAGE_HANDLER_ERROR", connectionId, { details: err.message, type, payload }, "error", conn);
  }
}
