import jwt from "jsonwebtoken";
import { env } from "./env.js";
import { TokenClaims } from "@moots/contracts";

/**
 * Verifies the JWT and returns the payload.
 * Throws an error if the token is invalid or expired.
 */
export function verifyToken(token: string): TokenClaims {
  if (!token) {
    throw new Error("Token is missing");
  }

  // The API service issues tokens containing { actorId }
  const payload = jwt.verify(token, env.JWT_SECRET) as TokenClaims;
  return payload;
}
