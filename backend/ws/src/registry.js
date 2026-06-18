import crypto from "crypto";
import { HEARTBEAT_INTERVAL } from "./config.js";

export class ConnectionRegistry {
  constructor() {
    this.connections = new Map(); // connectionId -> { connectionId, ws, userId, sessionId, connectedAt, lastSeen, connectionType, isAlive }
    this.socketToId = new Map(); // ws -> connectionId
  }

  register(ws) {
    const connectionId = crypto.randomUUID();
    const metadata = {
      connectionId,
      ws,
      userId: null,
      sessionId: null,
      connectedAt: new Date(),
      lastSeen: new Date(),
      connectionType: null, // "queue" | "chat"
      isAlive: true,
    };

    this.connections.set(connectionId, metadata);
    this.socketToId.set(ws, connectionId);
    return metadata;
  }

  deregister(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      this.socketToId.delete(conn.ws);
      this.connections.delete(connectionId);
    }
  }

  get(connectionId) {
    return this.connections.get(connectionId);
  }

  getBySocket(ws) {
    const id = this.socketToId.get(ws);
    return id ? this.connections.get(id) : null;
  }

  getConnectionByUserId(userId, type = null) {
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && (!type || conn.connectionType === type)) {
        return conn;
      }
    }
    return null;
  }

  updateMetadata(connectionId, updates) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      Object.assign(conn, updates);
      conn.lastSeen = new Date();
    }
  }

  heartbeat(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.isAlive = true;
      conn.lastSeen = new Date();
    }
  }

  startHeartbeatMonitor(wss, onStaleConnection) {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((conn) => {
        if (!conn.isAlive) {
          // Connection didn't respond to ping in time
          onStaleConnection(conn);
          conn.ws.terminate();
          this.deregister(conn.connectionId);
          return;
        }

        conn.isAlive = false;
        try {
          conn.ws.ping();
        } catch (err) {
          conn.ws.terminate();
          this.deregister(conn.connectionId);
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  stopHeartbeatMonitor() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}
export const registry = new ConnectionRegistry();
