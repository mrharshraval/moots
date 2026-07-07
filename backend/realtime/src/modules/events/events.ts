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
      const payload = event.payload;
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
      const payload = event.payload;
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
      const payload = event.payload;
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
}
