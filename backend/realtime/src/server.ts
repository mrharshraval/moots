import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import { parse } from "url";
import crypto from "crypto";
import { PORT, ALLOWED_ORIGINS, STALE_CLEANUP_INTERVAL } from "./config.js";
import { env } from "./env.js";
import { registry, ConnectionMetadata } from "./registry.js";
import { matchmakingService } from "./matchmaking.js";
import { sessionService } from "./session.js";
import { messagingService, structuredLog } from "./messaging.js";
import { logger } from "./lib/logger.js";
import { verifyToken } from "./auth.js";
import { metricsRegistry, wsConnectionsActive, wsMatchmakingQueueSize } from "./lib/metrics.js";
import { redis } from "./lib/redis.js";

// Initialize a unified HTTP Server to handle /health and /metrics endpoint
const server = createServer(async (req, res) => {
  if (!req.url) return;
  const parsedUrl = parse(req.url, true);
  if (parsedUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "moots-realtime",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        clientsCount: wss.clients.size,
      })
    );
  } else if (parsedUrl.pathname === "/metrics") {
    try {
      res.writeHead(200, { "Content-Type": metricsRegistry.contentType });
      res.end(await metricsRegistry.metrics());
    } catch (ex) {
      res.writeHead(500);
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Initialize the WebSocket Server (without port, bound to unified HTTP server upgrades)
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req: IncomingMessage, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    wss.emit("connection", ws, req);
  });
});

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

  // 2. JWT Authentication
  const tokenRaw = parsedUrl.query.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  
  let decodedUser;
  try {
    if (!token) throw new Error("Missing token");
    decodedUser = verifyToken(token);
  } catch (error: any) {
    structuredLog("AUTH_FAILED", "SYSTEM", {
      details: `Invalid or missing token (IP: ${clientIp}) - ${error.message}`,
    }, "warn");

    redis.lpush("moots:command:audit_log", JSON.stringify({
      actorId: null,
      event: "WS_AUTH_FAILURE",
      metadata: { reason: error.message, origin, requestId },
      ip: typeof clientIp === "string" ? clientIp : Array.isArray(clientIp) ? clientIp[0] : null,
    })).catch(() => {});

    ws.close(4001, "Unauthorized");
    return;
  }

  // 3. Register Connection with Request ID and Authenticated User
  const actorId = decodedUser.actorId || null;
  const email = (decodedUser as any).email || null;
  const conn = registry.register(ws, requestId, actorId, email);

  redis.lpush("moots:command:audit_log", JSON.stringify({
    actorId,
    event: "WS_AUTH_SUCCESS",
    metadata: { email, origin, requestId },
    ip: typeof clientIp === "string" ? clientIp : Array.isArray(clientIp) ? clientIp[0] : null,
  })).catch(() => {});

  structuredLog("CONNECTION_OPENED", conn.connectionId, {
    details: `IP: ${clientIp} | Origin: ${origin || "None"}`,
  });

  // 3. Heartbeat setup
  ws.on("pong", () => {
    registry.heartbeat(conn.connectionId);
  });

  // 4. Inbound Message Handling
  ws.on("message", (rawMessage: Buffer) => {
    messagingService.handleMessage(conn.connectionId, rawMessage.toString());
  });

  // 5. Connection Close Handling
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

  // 6. Error handling
  ws.on("error", (error: Error) => {
    structuredLog("CONNECTION_ERROR", conn.connectionId, {
      details: error.message,
    }, "error");
  });
});

// Start active heartbeat monitor (pings clients)
registry.startHeartbeatMonitor(wss, async (conn: ConnectionMetadata) => {
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
  // @ts-ignore
  if (wsMatchmakingQueueSize && typeof wsMatchmakingQueueSize.set === 'function') {
    wsMatchmakingQueueSize.set(queueSize);
  }
  
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

// Graceful shutdown on process termination signals (SIGTERM, SIGINT)
const shutdown = (signal: string) => {
  structuredLog("SHUTDOWN_SIGNAL", "SYSTEM", { details: `Received ${signal}. Closing server gracefully...` }, "warn");

  // Close all active connections
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === client.OPEN) {
      client.close(1001, "Server is shutting down");
    }
  });

  wss.close(() => {
    structuredLog("SERVER_SHUTDOWN", "SYSTEM", { details: 'Server closed. Exiting process.' }, "warn");
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    structuredLog("FORCE_EXIT", "SYSTEM", { details: 'Force exiting after timeout.' }, "error");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Startup Validation Check
async function validateStartup() {
  logger.info("Running startup checks and diagnostics...");
  logger.info({
    service: "moots-realtime",
    version: "1.0.0",
    environment: env.NODE_ENV,
    port: PORT,
  }, "Configuration summary:");
}

import { initializeEventListener } from "./events.js";

validateStartup().then(() => {
  initializeEventListener();
  server.listen(PORT, () => {
    logger.info(`WebSocket and Health HTTP Server listening on port ${PORT}`);
  });
});
