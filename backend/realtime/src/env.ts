import dotenv from "dotenv";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env.development" });
  dotenv.config();
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGINS: z.string().transform((str) => str.split(",").map((s) => s.trim())).default(["http://localhost:3000","http://localhost:3002","https://www.moots.in","https://moots.in","https://ws.moots.in"]),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  INTERNAL_SERVICE_KEY: z.string().min(16, "INTERNAL_SERVICE_KEY must be at least 16 characters long"),
  API_URL: z.string().default("http://localhost:3002"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
export default env;
