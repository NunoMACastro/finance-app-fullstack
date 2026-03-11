import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface AccessPayload {
  sub: string;
  type: "access";
}

interface RefreshPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export function signAccessToken(userId: string): string {
  const payload: AccessPayload = { sub: userId, type: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshPayload = { sub: userId, jti, type: "refresh" };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}
