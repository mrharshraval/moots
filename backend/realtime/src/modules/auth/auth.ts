import jwt from "jsonwebtoken";
import { env } from "../../env.js";
import { TokenClaims, TokenClaimsSchema } from "@moots/contracts";

export function verifyToken(token: string): TokenClaims {
  const secret = env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  const parsed = TokenClaimsSchema.parse(decoded);
  if (parsed.type && parsed.type !== "access") {
    throw new Error("Invalid token type");
  }
  return parsed;
}
