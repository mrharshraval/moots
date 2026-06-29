import crypto from "crypto";
import { WebSocket } from "ws";
import { RECONNECT_TIMEOUT } from "./config.js";
import { ConnectionRegistry } from "./registry.js";
import { redis } from "./lib/redis.js";

export interface Session {
  sessionId: string;
  users: string[];
  nicknames: Record<string, string>;
  usernames: Record<string, string | null>;
  messages: any[];
  createdAt: Date;
  activeConnections: Map<string, string>;
  disconnectTimeouts: Map<string, NodeJS.Timeout>;
}

export class SessionService {
  private sessions = new Map<string, Session>();

  createSession(
    userId1: string,
    userId2: string,
    nickname1 = "Stranger",
    nickname2 = "Stranger",
    username1: string | null = null,
    username2: string | null = null
  ): Session {
    const sessionId = `session-${crypto.randomUUID()}`;
    const session: Session = {
      sessionId,
      users: [userId1, userId2],
      nicknames: {
        [userId1]: nickname1,
        [userId2]: nickname2,
      },
      usernames: {
        [userId1]: username1,
        [userId2]: username2,
      },
      messages: [],
      createdAt: new Date(),
      activeConnections: new Map(),
      disconnectTimeouts: new Map(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  async joinSession(
    sessionId: string,
    actorId: string,
    connectionId: string,
    registry: ConnectionRegistry,
    onPartnerJoined: (ws: WebSocket, joinedUserId: string) => void
  ): Promise<Session> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    } else {
      if (!session.users.includes(actorId)) {
        throw new Error(`Unauthorized: User ${actorId} is not a participant of session ${sessionId}`);
      }
      if (!session.nicknames) {
        session.nicknames = {};
      }
      if (!session.usernames) {
        session.usernames = {};
      }
    }

    const existingTimeout = session.disconnectTimeouts.get(actorId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      session.disconnectTimeouts.delete(actorId);
    }

    // Delete Redis disconnect key globally to signal reconnection
    await redis.del(`moots:session:${sessionId}:disconnect:${actorId}`);

    session.activeConnections.set(actorId, connectionId);

    const partnerId = session.users.find((id) => id !== actorId);
    if (partnerId) {
      const partnerConnId = session.activeConnections.get(partnerId);
      if (partnerConnId) {
        const partnerConn = registry.get(partnerConnId);
        if (partnerConn && partnerConn.ws) {
          onPartnerJoined(partnerConn.ws, actorId);
        }
      }
    }

    return session;
  }

  async handleDisconnect(
    connectionId: string,
    registry: ConnectionRegistry,
    onPartnerDisconnected: (ws: WebSocket, disconnectedUserId: string) => void
  ) {
    for (const [sessionId, session] of this.sessions.entries()) {
      for (const [actorId, connId] of session.activeConnections.entries()) {
        if (connId === connectionId) {
          session.activeConnections.delete(actorId);

          // Set global Redis disconnect key with TTL
          const redisKey = `moots:session:${sessionId}:disconnect:${actorId}`;
          await redis.setex(redisKey, Math.ceil(RECONNECT_TIMEOUT / 1000), "1");

          const timeoutId = setTimeout(async () => {
            session.disconnectTimeouts.delete(actorId);

            // Verify if user is still disconnected globally (if key exists)
            const stillDisconnected = await redis.exists(redisKey);
            if (stillDisconnected === 1) {
              await redis.del(redisKey);

              const partnerId = session.users.find((id) => id !== actorId);
              if (partnerId) {
                const partnerConnId = session.activeConnections.get(partnerId);
                if (partnerConnId) {
                  const partnerConn = registry.get(partnerConnId);
                  if (partnerConn && partnerConn.ws) {
                    onPartnerDisconnected(partnerConn.ws, actorId);
                  }
                }
              }

              if (session.activeConnections.size === 0) {
                this.sessions.delete(sessionId);
              }
            }
          }, RECONNECT_TIMEOUT);

          session.disconnectTimeouts.set(actorId, timeoutId);
        }
      }
    }
  }

  broadcast(sessionId: string, messagePayload: any, registry: ConnectionRegistry, excludeActorIds?: string[]) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.users.forEach((actorId) => {
      if (excludeActorIds?.includes(actorId)) return;
      const connId = session.activeConnections.get(actorId);
      if (connId) {
        const conn = registry.get(connId);
        if (conn && conn.ws && conn.ws.readyState === conn.ws.OPEN) {
          conn.ws.send(JSON.stringify(messagePayload));
        }
      }
    });
  }

  cleanupStaleSessions() {
    const now = new Date().getTime();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.activeConnections.size === 0 && (now - session.createdAt.getTime()) > 3600000) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getSessionsCount() {
    return this.sessions.size;
  }
}

export const sessionService = new SessionService();
