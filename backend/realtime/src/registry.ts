import crypto from "crypto";
import { WebSocket, WebSocketServer } from "ws";
import { HEARTBEAT_INTERVAL } from "./config.js";

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity = 60;
  private readonly fillRate = 1; // 1 token per second

  constructor() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  allow(): boolean {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.fillRate);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

export interface ConnectionMetadata {
  connectionId: string;
  ws: WebSocket;
  requestId: string | null;
  actorId: string | null;
  email: string | null;
  sessionId: string | null;
  connectedAt: Date;
  lastSeen: Date;
  connectionType: "queue" | "chat" | null;
  isAlive: boolean;
  rateLimiter: TokenBucket;
}

export class ConnectionRegistry {
  private connections = new Map<string, ConnectionMetadata>();
  private socketToId = new Map<WebSocket, string>();
  private actorToIds = new Map<string, Set<string>>(); // Reverse Index (P2.12)
  private pingInterval?: NodeJS.Timeout;

  register(ws: WebSocket, requestId: string | null = null, actorId: string | null = null, email: string | null = null): ConnectionMetadata {
    const connectionId = crypto.randomUUID();
    const metadata: ConnectionMetadata = {
      connectionId,
      ws,
      requestId,
      actorId,
      email,
      sessionId: null,
      connectedAt: new Date(),
      lastSeen: new Date(),
      connectionType: null,
      isAlive: true,
      rateLimiter: new TokenBucket(),
    };

    this.connections.set(connectionId, metadata);
    this.socketToId.set(ws, connectionId);

    if (actorId) {
      if (!this.actorToIds.has(actorId)) {
        this.actorToIds.set(actorId, new Set());
      }
      this.actorToIds.get(actorId)!.add(connectionId);
    }

    return metadata;
  }

  deregister(connectionId: string) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      this.socketToId.delete(conn.ws);
      this.connections.delete(connectionId);
      if (conn.actorId) {
        const actorConnections = this.actorToIds.get(conn.actorId);
        if (actorConnections) {
          actorConnections.delete(connectionId);
          if (actorConnections.size === 0) {
            this.actorToIds.delete(conn.actorId);
          }
        }
      }
    }
  }

  get(connectionId: string): ConnectionMetadata | undefined {
    return this.connections.get(connectionId);
  }

  getBySocket(ws: WebSocket): ConnectionMetadata | undefined {
    const id = this.socketToId.get(ws);
    return id ? this.connections.get(id) : undefined;
  }

  getConnectionByActorId(actorId: string, type: "queue" | "chat" | null = null): ConnectionMetadata | null {
    const connectionIds = this.actorToIds.get(actorId);
    if (!connectionIds) return null;

    for (const id of connectionIds) {
      const conn = this.connections.get(id);
      if (conn && (!type || conn.connectionType === type)) {
        return conn;
      }
    }
    return null;
  }

  updateMetadata(connectionId: string, updates: Partial<Omit<ConnectionMetadata, "connectionId" | "ws">>) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      // Check if actorId changed and update reverse index
      if (updates.actorId !== undefined && updates.actorId !== conn.actorId) {
        if (conn.actorId) {
          const oldSet = this.actorToIds.get(conn.actorId);
          if (oldSet) {
            oldSet.delete(connectionId);
            if (oldSet.size === 0) this.actorToIds.delete(conn.actorId);
          }
        }
        if (updates.actorId) {
          if (!this.actorToIds.has(updates.actorId)) {
            this.actorToIds.set(updates.actorId, new Set());
          }
          this.actorToIds.get(updates.actorId)!.add(connectionId);
        }
      }

      Object.assign(conn, updates);
      conn.lastSeen = new Date();
    }
  }

  heartbeat(connectionId: string) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.isAlive = true;
      conn.lastSeen = new Date();
    }
  }

  startHeartbeatMonitor(wss: WebSocketServer, onStaleConnection: (conn: ConnectionMetadata) => void) {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((conn) => {
        if (!conn.isAlive) {
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
