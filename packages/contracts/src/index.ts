import { z } from "zod";

export const TokenClaimsSchema = z.object({
  actorId: z.string().min(1),
  type: z.string().optional(),
});

export type TokenClaims = z.infer<typeof TokenClaimsSchema>;

export * from "./shared/types.js";
export * from "./shared/errors.js";
export * from "./events.js";

// API Validations
export * from "./api/auth.validators.js";
export * from "./api/connections.validators.js";
export * from "./api/conversations.validators.js";
export * from "./api/messages.validators.js";
export * from "./api/users.validators.js";

// Realtime Payloads
export * from "./realtime/ws.payloads.js";
