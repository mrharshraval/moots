import { registry } from "../registry/registry.js";
import { sessionService } from "../rooms/session.js";
import { DomainEvent } from "@moots/contracts";

export function handleDomainEvent(event: DomainEvent) {
  switch (event.eventType) {
    case "conversation.provisioned": {
      const payload = event.payload;
      const { conversationId, actorId1, actorId2, metadata } = payload;
      const actor1Meta = metadata?.actor1 || {};
      const actor2Meta = metadata?.actor2 || {};

      const session = sessionService.createSession(
        actorId1, 
        actorId2, 
        actor1Meta.nickname, 
        actor2Meta.nickname, 
        actor1Meta.username, 
        actor2Meta.username,
        conversationId
      );

      const conn1 = registry.get(actor1Meta.connectionId);
      const conn2 = registry.get(actor2Meta.connectionId);

      if (conn1 && conn1.ws) {
        conn1.ws.send(
          JSON.stringify({
            type: "match-found",
            payload: {
              sessionId: session.sessionId,
              peerId: actorId2,
              peerNickname: actor2Meta.nickname || "Stranger",
              peerUsername: actor2Meta.username || null,
            },
          })
        );
        registry.updateMetadata(actor1Meta.connectionId, { sessionId: session.sessionId, connectionType: "chat" });
      }

      if (conn2 && conn2.ws) {
        conn2.ws.send(
          JSON.stringify({
            type: "match-found",
            payload: {
              sessionId: session.sessionId,
              peerId: actorId1,
              peerNickname: actor1Meta.nickname || "Stranger",
              peerUsername: actor1Meta.username || null,
            },
          })
        );
        registry.updateMetadata(actor2Meta.connectionId, { sessionId: session.sessionId, connectionType: "chat" });
      }

      session.activeConnections.set(actorId1, actor1Meta.connectionId);
      session.activeConnections.set(actorId2, actor2Meta.connectionId);
      break;
    }

    case "notification.created": {
      const payload = event.payload;
      const { actorId, type: notifType, entityId, payload: notifPayload, createdAt } = payload;
      
      const connections = registry.getConnectionsByActorId(actorId);
      for (const conn of connections) {
        if (conn.ws) {
          conn.ws.send(
            JSON.stringify({
              type: "notification-received",
              payload: {
                actorId,
                type: notifType,
                entityId,
                payload: notifPayload,
                createdAt,
              }
            })
          );
        }
      }
      break;
    }

    case "message.persisted": {
      const payload = event.payload;
      const { id, clientMessageId, conversationId, senderActorId, sender, content, createdAt, replyToId } = payload;
      const session = sessionService.getSession(conversationId);
      
      const wsMsg = {
        id,
        clientMessageId,
        senderId: senderActorId,
        sender,
        content,
        time: createdAt,
        reactions: {},
        seen: false,
        replyTo: replyToId ? { id: replyToId } : undefined,
        status: "PERSISTED"
      };

      if (session) {
        session.messages.push({ ...wsMsg, _actorId: senderActorId });
        if (session.messages.length > 100) session.messages.shift();
      }

      sessionService.broadcast(conversationId, {
        type: "message",
        payload: wsMsg,
      }, registry);
      break;
    }

    case "message.edited": {
      const payload = event.payload;
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

    case "message.deleted": {
      const payload = event.payload;
      const { messageId, conversationId } = payload;
      const session = sessionService.getSession(conversationId);

      if (session) {
        session.messages = session.messages.filter((m: any) => m.id !== messageId);
      }

      sessionService.broadcast(conversationId, {
        type: "message-deleted",
        payload: { messageId },
      }, registry);
      break;
    }

    case "reaction.updated": {
      const payload = event.payload;
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
      const payload = event.payload;
      const { conversationId, actorId } = payload;
      const session = sessionService.getSession(conversationId);

      if (session) {
        session.messages.forEach((m: any) => {
          if (m._actorId !== actorId && !m.seen) {
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
      const payload = event.payload;
      const { connectionId, senderActorId, receiverActorId } = payload;
      const connections = registry.getConnectionsByActorId(receiverActorId);
      for (const conn of connections) {
        if (conn.ws) {
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
      }
      break;
    }

    case "connection.accepted": {
      const payload = event.payload;
      const { connectionId, actorId1, actorId2 } = payload;
      // Notify both users if they are online (all devices)
      [actorId1, actorId2].forEach((actorId) => {
        const connections = registry.getConnectionsByActorId(actorId);
        for (const conn of connections) {
          if (conn.ws) {
            conn.ws.send(
              JSON.stringify({
                type: "connection:accepted",
                payload: {
                  connectionId,
                },
              })
            );
          }
        }
      });
      break;
    }

    case "connection.removed": {
      const payload = event.payload;
      const { connectionId, actorId1, actorId2 } = payload;
      [actorId1, actorId2].forEach((actorId) => {
        const connections = registry.getConnectionsByActorId(actorId);
        for (const conn of connections) {
          if (conn.ws) {
            conn.ws.send(
              JSON.stringify({
                type: "connection:removed",
                payload: {
                  connectionId,
                },
              })
            );
          }
        }
      });
      break;
    }

    case "connection.rejected": {
      const payload = event.payload;
      const { connectionId, actorId1, actorId2 } = payload;
      [actorId1, actorId2].forEach((actorId) => {
        const connections = registry.getConnectionsByActorId(actorId);
        for (const conn of connections) {
          if (conn.ws) {
            conn.ws.send(
              JSON.stringify({
                type: "connection:rejected",
                payload: { connectionId },
              })
            );
          }
        }
      });
      break;
    }

    case "connection.cancelled": {
      const payload = event.payload;
      const { connectionId, actorId1, actorId2 } = payload;
      [actorId1, actorId2].forEach((actorId) => {
        const connections = registry.getConnectionsByActorId(actorId);
        for (const conn of connections) {
          if (conn.ws) {
            conn.ws.send(
              JSON.stringify({
                type: "connection:cancelled",
                payload: { connectionId },
              })
            );
          }
        }
      });
      break;
    }

    case "participant.joined": {
      const { conversationId, actorId, role } = event.payload;
      const session = sessionService.getSession(conversationId);
      if (session) {
        if (!session.users.includes(actorId)) {
          session.users.push(actorId);
        }
      }
      sessionService.broadcast(conversationId, {
        type: "group:participant-joined",
        payload: { conversationId, actorId, role }
      }, registry);
      break;
    }

    case "participant.left": {
      const { conversationId, actorId, kickedBy } = event.payload;
      const session = sessionService.getSession(conversationId);
      if (session) {
        session.users = session.users.filter((id) => id !== actorId);
      }
      sessionService.broadcast(conversationId, {
        type: "group:participant-left",
        payload: { conversationId, actorId, kickedBy }
      }, registry);
      break;
    }

    case "participant.role_updated": {
      const { conversationId, actorId, role } = event.payload;
      sessionService.broadcast(conversationId, {
        type: "group:role-updated",
        payload: { conversationId, actorId, role }
      }, registry);
      break;
    }

    case "call.initiated": {
      const { callId, conversationId, initiatorActorId, type: callType, participantIds } = event.payload;
      if (Array.isArray(participantIds)) {
        participantIds.forEach(actorId => {
          const connections = registry.getConnectionsByActorId(actorId);
          for (const conn of connections) {
            if (conn.ws) {
              conn.ws.send(JSON.stringify({
                type: "call:incoming",
                payload: { callId, conversationId, initiatorActorId, type: callType }
              }));
            }
          }
        });
      }
      break;
    }

    case "call.accepted": 
    case "call.declined": 
    case "call.ended": 
    case "call.missed": {
      const { callId, conversationId } = event.payload;
      // Because we don't have participantIds in all these events (though we could add them), 
      // the simplest way without changing all payloads is to broadcast to the conversation's active connections.
      // However, to correctly dismiss ringing on ALL devices, we need the participant IDs. 
      // For now, we will broadcast via sessionService which reaches active viewers. 
      // Ideally, the API should include participantIds in all call events so we can reach all devices.
      // But actually, we can fetch the Session and get `session.users` if it's cached, 
      // or we can just stick to `sessionService.broadcast`. 
      // Wait, let's just broadcast via sessionService, but also we can add participantIds if we wanted to.
      const actionMap = {
        "call.accepted": "call:accepted",
        "call.declined": "call:declined",
        "call.missed": "call:missed",
        "call.ended": "call:ended"
      } as const;
      
      sessionService.broadcast(conversationId, {
        type: actionMap[event.eventType as keyof typeof actionMap],
        payload: event.payload
      }, registry);
      break;
    }

    case "conversation.hidden": {
      const { conversationId, actorId, hiddenAt, broadcastRule } = event.payload;
      if (broadcastRule === "TO_SELF") {
        const connections = registry.getConnectionsByActorId(actorId);
        for (const conn of connections) {
          if (conn.ws) {
            conn.ws.send(JSON.stringify({
              type: "conversation:hidden",
              payload: { conversationId, hiddenAt }
            }));
          }
        }
      }
      break;
    }

    case "conversation.ended": {
      const { conversationId, endedAt, endedByActorId, broadcastRule } = event.payload;
      if (broadcastRule === "TO_CONVERSATION") {
        sessionService.broadcast(conversationId, {
          type: "conversation:ended",
          payload: { conversationId, endedAt, endedByActorId }
        }, registry);
      }
      break;
    }
  }
}
