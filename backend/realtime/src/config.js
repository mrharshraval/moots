import { env } from "./env.js";

// Centralized configuration parameters
export const PORT = env.PORT;

export const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;

export const HEARTBEAT_INTERVAL = 20000; // 20 seconds to be safe on Render.com

export const RECONNECT_TIMEOUT = 30000; // 30 seconds grace period for client page transitions / reconnects

export const STALE_CLEANUP_INTERVAL = 60000; // Run cleanups every minute
