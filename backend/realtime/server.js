import { WebSocketServer } from "ws";
import { PORT, ALLOWED_ORIGINS, STALE_CLEANUP_INTERVAL } from "./src/config.js";
import { env } from "./src/env.js";
import { registry } from "./src/registry.js";
import { matchmakingService } from "./src/matchmaking.js";
import { sessionService } from "./src/session.js";
import { messagingService, structuredLog } from "./src/messaging.js";

// Initialize the WebSocket Server
const wss = new WebSocketServer({ port: PORT });

structuredLog("STARTING_SERVER", "SYSTEM", { details: `Listening on port ${PORT}` });

wss.on("listening", () => {
  structuredLog("SERVER_LISTENING", "SYSTEM", { details: `WebSocket server is listening on port ${PORT}` });
});

wss.on("connection", (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const origin = req.headers.origin;

  // 1. Origin Verification (Security Standard to prevent Cross-Site WebSocket Hijacking - CSWSH)
  if (env.NODE_ENV === "production") {
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      structuredLog("CONNECTION_REJECTED", "SYSTEM", {
        details: `Unauthorized origin: ${origin || "None"} (IP: ${clientIp})`,
      }, "warn");
      ws.close(1008, "Unauthorized Origin");
      return;
    }
  }

  // 2. Register Connection
  const conn = registry.register(ws);

  structuredLog("CONNECTION_OPENED", conn.connectionId, {
    details: `IP: ${clientIp} | Origin: ${origin || "None"}`,
  });

  // 3. Heartbeat setup
  ws.on("pong", () => {
    registry.heartbeat(conn.connectionId);
  });

  // 4. Inbound Message Handling
  ws.on("message", (rawMessage) => {
    messagingService.handleMessage(conn.connectionId, rawMessage);
  });

  // 5. Connection Close Handling
  ws.on("close", () => {
    structuredLog("CONNECTION_CLOSED", conn.connectionId, {
      userId: conn.userId || undefined,
      sessionId: conn.sessionId || undefined,
      details: `Type: ${conn.connectionType || "unidentified"}`,
    });

    if (conn.connectionType === "queue" && conn.userId) {
      matchmakingService.removeUser(conn.userId);
    }

    if (conn.userId) {
      sessionService.handleDisconnect(
        conn.connectionId,
        registry,
        // Callback to notify partner when grace period actually expires
        (partnerWs, disconnectedUserId) => {
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
  ws.on("error", (error) => {
    structuredLog("CONNECTION_ERROR", conn.connectionId, {
      details: error.message,
    }, "error");
  });
});

// Start active heartbeat monitor (pings clients)
registry.startHeartbeatMonitor(wss, (conn) => {
  structuredLog("HEARTBEAT_TIMEOUT", conn.connectionId, {
    userId: conn.userId || undefined,
    sessionId: conn.sessionId || undefined,
  }, "warn");

  if (conn.connectionType === "queue" && conn.userId) {
    matchmakingService.removeUser(conn.userId);
  }

  if (conn.userId) {
    sessionService.handleDisconnect(
      conn.connectionId,
      registry,
      (partnerWs, disconnectedUserId) => {
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
const cleanupJob = setInterval(() => {
  const isConnectionActive = (connectionId) => registry.get(connectionId) !== undefined;
  
  matchmakingService.cleanupStaleQueueEntries(isConnectionActive);
  sessionService.cleanupStaleSessions();
  
  structuredLog("CLEANUP_JOB", "SYSTEM", {
    details: `Stats - Clients: ${wss.clients.size} | Active Queued: ${matchmakingService.getQueueSize()} | Active Sessions: ${sessionService.getSessionsCount()}`
  });
}, STALE_CLEANUP_INTERVAL);

wss.on("close", () => {
  registry.stopHeartbeatMonitor();
  clearInterval(cleanupJob);
});

wss.on("error", (error) => {
  structuredLog("SERVER_ERROR", "SYSTEM", { details: error.message }, "error");
});

// Graceful shutdown on process termination signals (SIGTERM, SIGINT)
const shutdown = (signal) => {
  structuredLog("SHUTDOWN_SIGNAL", "SYSTEM", { details: `Received ${signal}. Closing server gracefully...` }, "warn");

  // Close all active connections
  wss.clients.forEach((client) => {
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
