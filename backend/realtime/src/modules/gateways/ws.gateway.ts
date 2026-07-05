import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "url";
import crypto from "crypto";
import { ALLOWED_ORIGINS, STALE_CLEANUP_INTERVAL } from "../../config.js";
import { registry } from "../registry/registry.js";
import { matchmakingService } from "../matchmaking/matchmaking.js";
import { sessionService } from "../rooms/session.js";
import { messagingService } from "../delivery/messaging.js";
import { structuredLog } from "../../lib/logger.js";
import { verifyToken } from "../auth/auth.js";
import { wsConnectionsActive, wsMatchmakingQueueSize } from "../../lib/metrics.js";
import { redis } from "../../lib/redis.js";

export function initializeWebSocketGateway(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const origin = req.headers.origin;
    
    if (!req.url) return;
    // Extract Request ID from handshake query parameters
    const parsedUrl = parse(req.url, true);
    const requestId = Array.isArray(parsedUrl.query.requestId) 
      ? parsedUrl.query.requestId[0] 
      : (parsedUrl.query.requestId || `req-ws-${crypto.randomUUID()}`);

    // 1. Origin Verification (Security Standard to prevent Cross-Site WebSocket Hijacking - CSWSH)
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      structuredLog("CONNECTION_REJECTED", "SYSTEM", {
        details: `Unauthorized origin: ${origin || "None"} (IP: ${clientIp})`,
      }, "warn");
      ws.close(1008, "Unauthorized Origin");
      return;
    }

    // 2. Register Unauthenticated Connection
    const conn = registry.register(ws, requestId, null, null);

    structuredLog("CONNECTION_OPENED", conn.connectionId, {
      details: `IP: ${clientIp} | Origin: ${origin || "None"} | RequestId: ${requestId}`,
    });

    // 3. Set Authentication Timeout
    // Drop the connection if it hasn't authenticated within 5 seconds
    const authTimeout = setTimeout(() => {
      const currentConn = registry.get(conn.connectionId);
      if (currentConn && !currentConn.actorId) {
        structuredLog("AUTH_TIMEOUT", conn.connectionId, {
          details: `Client failed to authenticate within 5s (IP: ${clientIp})`,
        }, "warn");
        
        redis.lpush("moots:command:audit_log", JSON.stringify({
          actorId: null,
          event: "WS_AUTH_TIMEOUT",
          metadata: { origin, requestId },
          ip: typeof clientIp === "string" ? clientIp : Array.isArray(clientIp) ? clientIp[0] : null,
        })).catch(() => {});

        ws.close(4001, "Authentication timeout");
      }
    }, 5000);

    // Heartbeat setup
    ws.on("pong", () => {
      registry.heartbeat(conn.connectionId);
    });

    // Inbound Message Handling
    ws.on("message", (rawMessage: Buffer) => {
      messagingService.handleMessage(conn.connectionId, rawMessage.toString());
    });

    // Connection Close Handling
    ws.on("close", async () => {
      structuredLog("CONNECTION_CLOSED", conn.connectionId, {
        actorId: conn.actorId || undefined,
        sessionId: conn.sessionId || undefined,
        details: `Type: ${conn.connectionType || "unidentified"}`,
      });

      if (conn.connectionType === "queue" && conn.actorId) {
        await matchmakingService.removeUser(conn.actorId);
      }

      if (conn.actorId) {
        await sessionService.handleDisconnect(
          conn.connectionId,
          registry,
          // Callback to notify partner when grace period actually expires
          (partnerWs: WebSocket, disconnectedUserId: string) => {
            partnerWs.send(
              JSON.stringify({
                type: "partner-disconnected",
                payload: { partnerId: disconnectedUserId },
              })
            );
          }
        );
      }

      registry.deregister(conn.connectionId);
    });

    // Error handling
    ws.on("error", (error: Error) => {
      structuredLog("CONNECTION_ERROR", conn.connectionId, {
        details: error.message,
      }, "error");
    });
  });

  // Start active heartbeat monitor (pings clients)
  registry.startHeartbeatMonitor(wss, async (conn) => {
    structuredLog("HEARTBEAT_TIMEOUT", conn.connectionId, {
      actorId: conn.actorId || undefined,
      sessionId: conn.sessionId || undefined,
    }, "warn");

    if (conn.connectionType === "queue" && conn.actorId) {
      await matchmakingService.removeUser(conn.actorId);
    }

    if (conn.actorId) {
      await sessionService.handleDisconnect(
        conn.connectionId,
        registry,
        (partnerWs: WebSocket, disconnectedUserId: string) => {
          partnerWs.send(
            JSON.stringify({
              type: "partner-disconnected",
              payload: { partnerId: disconnectedUserId },
            })
          );
        }
      );
    }
  });

  // Periodic background job for general stale resources cleanup
  const cleanupJob = setInterval(async () => {
    const isConnectionActive = (connectionId: string) => registry.get(connectionId) !== undefined;
    
    await matchmakingService.cleanupStaleQueueEntries(isConnectionActive);
    sessionService.cleanupStaleSessions();
    
    const queueSize = await matchmakingService.getQueueSize();
    wsConnectionsActive.set(wss.clients.size);
    wsMatchmakingQueueSize.set(queueSize);
    
    structuredLog("CLEANUP_JOB", "SYSTEM", {
      details: `Stats - Clients: ${wss.clients.size} | Active Queued: ${queueSize} | Active Sessions: ${sessionService.getSessionsCount()}`
    });
  }, STALE_CLEANUP_INTERVAL);

  wss.on("close", () => {
    registry.stopHeartbeatMonitor();
    clearInterval(cleanupJob);
  });

  wss.on("error", (error: Error) => {
    structuredLog("SERVER_ERROR", "SYSTEM", { details: error.message }, "error");
  });
}
