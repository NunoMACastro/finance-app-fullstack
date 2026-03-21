import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { clearRefreshCookie, getCookie, setRefreshCookie } from "../../lib/cookies.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  deleteMeSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetTutorialSchema,
  revokeAllSessionsSchema,
  sessionJtiParamsSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "./validators.js";
import * as authService from "./service.js";

export const authRouter = Router();

function credentialRateLimitKey(req: { ip?: string; body?: unknown }): string {
  const ip = req.ip ?? "unknown";
  const body = req.body as Record<string, unknown> | undefined;
  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  return `${ip}:${email || "anonymous"}`;
}

const credentialLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: credentialRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Muitos pedidos de autenticação. Tente novamente daqui a pouco.",
  },
});

const refreshLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(env.AUTH_RATE_LIMIT_MAX * 2, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Muitos pedidos de refresh. Tente novamente daqui a pouco.",
  },
});

authRouter.post(
  "/register",
  credentialLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input, req);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  }),
);

authRouter.post(
  "/login",
  credentialLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input, req);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  }),
);

authRouter.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    const refreshToken = getCookie(req, env.REFRESH_COOKIE_NAME) ?? input.refreshToken;
    const result = await authService.refresh(refreshToken, req);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  }),
);

authRouter.post(
  "/logout",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const input = logoutSchema.parse(req.body ?? {});
    await authService.logout(getCookie(req, env.REFRESH_COOKIE_NAME) ?? input.refreshToken);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await authService.me(req.auth!.userId);
    res.status(200).json(profile);
  }),
);

authRouter.post(
  "/tutorial/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await authService.completeTutorial(req.auth!.userId);
    res.status(200).json(profile);
  }),
);

authRouter.post(
  "/tutorial/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    resetTutorialSchema.parse(req.body ?? {});
    const profile = await authService.resetTutorial(req.auth!.userId);
    res.status(200).json(profile);
  }),
);

authRouter.patch(
  "/me/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body ?? {});
    const profile = await authService.updateProfile(req.auth!.userId, input);
    res.status(200).json(profile);
  }),
);

authRouter.patch(
  "/me/email",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateEmailSchema.parse(req.body ?? {});
    const profile = await authService.updateEmail(req.auth!.userId, input);
    res.status(200).json(profile);
  }),
);

authRouter.patch(
  "/me/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updatePasswordSchema.parse(req.body ?? {});
    await authService.updatePassword(req.auth!.userId, input);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await authService.listSessions(req.auth!.userId);
    res.status(200).json(sessions);
  }),
);

authRouter.delete(
  "/sessions/revoked",
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.removeRevokedSessions(req.auth!.userId);
    res.status(204).send();
  }),
);

authRouter.delete(
  "/sessions/:jti",
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = sessionJtiParamsSchema.parse(req.params);
    await authService.revokeSession(req.auth!.userId, params.jti);
    res.status(204).send();
  }),
);

authRouter.post(
  "/sessions/revoke-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    revokeAllSessionsSchema.parse(req.body ?? {});
    await authService.revokeAllSessions(req.auth!.userId);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/export",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await authService.exportUserData(req.auth!.userId);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"finance-export-${req.auth!.userId}.json\"`);
    res.status(200).json(data);
  }),
);

authRouter.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = deleteMeSchema.parse(req.body ?? {});
    await authService.deleteMe(req.auth!.userId, input.currentPassword);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);
