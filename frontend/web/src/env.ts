const isProd = process.env.NODE_ENV === "production";

if (isProd && typeof window === "undefined") {
  // Only check server-side variables on the server during runtime
  const required = ["AUTH_SECRET", "BACKEND_API_URL"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable "${key}"`);
    }
  }
}

export const env = {
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
  BACKEND_API_URL: process.env.BACKEND_API_URL || "http://localhost:3002",
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@moots.in",
  NODE_ENV: process.env.NODE_ENV || "development",
};
export default env;
