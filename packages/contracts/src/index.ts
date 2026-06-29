import { z } from "zod";

export const TokenClaimsSchema = z.object({
  actorId: z.string().uuid(),
  // Can add exp, iat later if needed but usually standard jsonwebtoken handles those
});

export type TokenClaims = z.infer<typeof TokenClaimsSchema>;
export * from "./events.js";
