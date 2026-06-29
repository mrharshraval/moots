import dotenv from "dotenv";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env.development" });
  dotenv.config();
}

const EnvSchema = z.object({
  PORT:            z.coerce.number().default(3002),
  DATABASE_URL:    z.string().min(1, "DATABASE_URL is required"),
  RESEND_API_KEY:  z.string().min(1, "RESEND_API_KEY is required"),
  JWT_SECRET:      z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  EMAIL_FROM:      z.string().default("Moots <noreply@moots.in>"),
  NODE_ENV:        z.enum(["development", "test", "production"]).default("development"),
  ALLOWED_ORIGINS: z.string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform(s => s.split(",").map(o => o.trim())),
  INTERNAL_SERVICE_KEY: z.string().default("test-internal-key-change-in-prod"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `  â€¢ ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`CRITICAL CONFIG ERROR â€” Invalid environment:\n${issues}`);
}

export const env = parsed.data;
export default env;
