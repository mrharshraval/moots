import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface JwtPayload {
  actorId: string;
}

export const jwtService = {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
  },

  signRefresh(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
  },

  verify(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  },
};
