import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ACCESS_ALGORITHM = "HS256";

interface AccessPayload {
  sub: string;
  sid: string;
  type: "access";
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

interface RefreshPayload {
  sub: string;
  sid: string;
  jti: string;
  type: "refresh";
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, sid: string): string {
  const payload: AccessPayload = {
    sub: userId,
    sid,
    type: "access",
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ACCESS_ALGORITHM,
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function signRefreshToken(userId: string, sid: string, jti: string): string {
  const payload: RefreshPayload = {
    sub: userId,
    sid,
    jti,
    type: "refresh",
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ACCESS_ALGORITHM,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ACCESS_ALGORITHM],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ACCESS_ALGORITHM],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as RefreshPayload;
}
