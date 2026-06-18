// Centralized configuration parameters
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

export const ALLOWED_ORIGINS = [
  "https://www.moots.in",
  "https://moots.in",
  "https://ws.moots.in"
];

export const HEARTBEAT_INTERVAL = 20000; // 20 seconds to be safe on Render.com

export const RECONNECT_TIMEOUT = 30000; // 30 seconds grace period for client page transitions / reconnects

export const STALE_CLEANUP_INTERVAL = 60000; // Run cleanups every minute
