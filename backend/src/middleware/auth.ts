import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { unauthorized } from "../lib/api-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    unauthorized("Token de acesso em falta", "ACCESS_TOKEN_MISSING");
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      unauthorized("Token invalido", "ACCESS_TOKEN_INVALID");
    }

    req.auth = { userId: payload.sub };
    next();
  } catch {
    unauthorized("Token invalido ou expirado", "ACCESS_TOKEN_INVALID");
  }
}
