import client from "prom-client";

// Initialize default metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

export const wsConnectionsActive = new client.Gauge({
  name: "ws_connections_active",
  help: "Number of active WebSocket connections",
});

export const wsMessagesTotal = new client.Counter({
  name: "ws_messages_total",
  help: "Total number of messages processed by the WebSocket server",
  labelNames: ["type", "direction"],
});

export const wsMatchmakingQueueSize = new client.Gauge({
  name: "ws_matchmaking_queue_size",
  help: "Number of users currently waiting in the matchmaking queue",
});

export const wsSessionDurationSeconds = new client.Histogram({
  name: "ws_session_duration_seconds",
  help: "Duration of chat sessions in seconds",
  buckets: [60, 300, 600, 1800, 3600, 7200], // 1m, 5m, 10m, 30m, 1h, 2h
});

export const wsMessageDeliveryDurationMs = new client.Histogram({
  name: "ws_message_delivery_duration_ms",
  help: "Time taken to deliver a message in milliseconds",
  buckets: [10, 50, 100, 250, 500, 1000],
});

export const metricsRegistry = client.register;
