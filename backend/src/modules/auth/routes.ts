import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./validators.js";
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
