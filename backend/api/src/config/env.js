import dotenv from "dotenv";

const isProd = process.env.NODE_ENV === "production";

// Load local environment variables only during development
if (!isProd) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env.development" });
  dotenv.config();
}

const required = ["DATABASE_URL", "RESEND_API_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable "${key}"`);
  }
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3002,
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || "Moots <noreply@moots.in>",
  NODE_ENV: process.env.NODE_ENV || "development",
};
export default env;
