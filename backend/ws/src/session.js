import crypto from "crypto";
import { RECONNECT_TIMEOUT } from "./config.js";

export class SessionService {
  constructor() {
    this.sessions = new Map(); // sessionId -> sessionData
  }

  createSession(userId1, userId2) {
    const sessionId = `session-${crypto.randomUUID()}`;
    const session = {
      sessionId,
      users: [userId1, userId2],
      messages: [],
      createdAt: new Date(),
      activeConnections: new Map(), // userId -> connectionId
      disconnectTimeouts: new Map(), // userId -> timeoutId
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  joinSession(sessionId, userId, connectionId, registry, onPartnerJoined) {
    let session = this.sessions.get(sessionId);
    if (!session) {
      // Create session on-demand if it doesn't exist yet (fallback support)
      session = {
        sessionId,
        users: [userId],
        messages: [],
        createdAt: new Date(),
        activeConnections: new Map(),
        disconnectTimeouts: new Map(),
      };
      this.sessions.set(sessionId, session);
    } else {
      if (!session.users.includes(userId)) {
        session.users.push(userId);
      }
    }

    // If there is an active disconnect timeout for this user, clear it
    const existingTimeout = session.disconnectTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      session.disconnectTimeouts.delete(userId);
    }

    // Register this connectionId for the user in the session
    session.activeConnections.set(userId, connectionId);

    // Notify partner that this user has connected/reconnected
    const partnerId = session.users.find((id) => id !== userId);
    if (partnerId) {
      const partnerConnId = session.activeConnections.get(partnerId);
      if (partnerConnId) {
        const partnerConn = registry.get(partnerConnId);
        if (partnerConn && partnerConn.ws) {
          onPartnerJoined(partnerConn.ws, userId);
        }
      }
    }

    return session;
  }

  handleDisconnect(connectionId, registry, onPartnerDisconnected) {
    // Find all sessions where this connection was active
    for (const [sessionId, session] of this.sessions.entries()) {
      for (const [userId, connId] of session.activeConnections.entries()) {
        if (connId === connectionId) {
          // Remove active connection reference
          session.activeConnections.delete(userId);

          // Start a grace period before notifying partner and destroying session
          const timeoutId = setTimeout(() => {
            session.disconnectTimeouts.delete(userId);
            
            // Send partner-disconnected alert
            const partnerId = session.users.find((id) => id !== userId);
            if (partnerId) {
              const partnerConnId = session.activeConnections.get(partnerId);
              if (partnerConnId) {
                const partnerConn = registry.get(partnerConnId);
                if (partnerConn && partnerConn.ws) {
                  onPartnerDisconnected(partnerConn.ws, userId);
                }
              }
            }

            // Cleanup session if all users are disconnected and grace periods expired
            if (session.activeConnections.size === 0) {
              this.sessions.delete(sessionId);
            }
          }, RECONNECT_TIMEOUT);

          session.disconnectTimeouts.set(userId, timeoutId);
        }
      }
    }
  }

  broadcast(sessionId, messagePayload, registry) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.users.forEach((userId) => {
      const connId = session.activeConnections.get(userId);
      if (connId) {
        const conn = registry.get(connId);
        if (conn && conn.ws && conn.ws.readyState === conn.ws.OPEN) {
          conn.ws.send(JSON.stringify(messagePayload));
        }
      }
    });
  }

  cleanupStaleSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      // If session is completely empty and older than 1 hour, clean it up
      if (session.activeConnections.size === 0 && (now - session.createdAt) > 3600000) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getSessionsCount() {
    return this.sessions.size;
  }
}
export const sessionService = new SessionService();
