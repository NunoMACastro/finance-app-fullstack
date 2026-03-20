import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { unauthorized } from "../lib/api-error.js";
import { AuthSessionModel } from "../models/auth-session.model.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  void (async () => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      unauthorized("Token de acesso em falta", "ACCESS_TOKEN_MISSING");
    }

    const token = authHeader.slice("Bearer ".length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      unauthorized("Token inválido ou expirado", "ACCESS_TOKEN_INVALID");
    }

    if (payload.type !== "access") {
      unauthorized("Token inválido", "ACCESS_TOKEN_INVALID");
    }

    const session = await AuthSessionModel.findOne({
      sid: payload.sid,
      userId: payload.sub,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .select({ sid: 1, userId: 1 })
      .lean();

    if (!session) {
      unauthorized("Sessão inválida ou revogada", "SESSION_INVALID");
    }

    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  })().catch(next);
}
