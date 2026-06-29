import dotenv from "dotenv";

const isProd = process.env.NODE_ENV === "production";

// Load local environment variables only during development
if (!isProd) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env.development" });
  dotenv.config();
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://www.moots.in",
        "https://moots.in",
        "https://ws.moots.in"
      ],
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "moots-dev-secret-key-minimum-32-characters-long",
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || "test-internal-key-change-in-prod",
  API_URL: process.env.API_URL || "http://localhost:3002",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};
export default env;
