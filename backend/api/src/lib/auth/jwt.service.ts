import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface JwtPayload {
  actorId: string;
  type?: string;
}

export const jwtService = {
  sign(payload: Omit<JwtPayload, "type">): string {
    return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, { expiresIn: "15m" });
  },

  verify(token: string): JwtPayload {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (payload.type && payload.type !== "access") {
      throw new Error("Invalid token type");
    }
    return payload;
  },
};
