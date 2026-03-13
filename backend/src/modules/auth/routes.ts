import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
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

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input, req);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input, req);
    res.status(200).json(result);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    const result = await authService.refresh(input.refreshToken, req);
    res.status(200).json(result);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const input = logoutSchema.parse(req.body ?? {});
    await authService.logout(input.refreshToken);
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
    res.status(204).send();
  }),
);
