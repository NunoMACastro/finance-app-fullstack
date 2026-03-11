import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  accountIdParamsSchema,
  createAccountSchema,
  joinByCodeSchema,
  memberParamsSchema,
  updateRoleSchema,
} from "./validators.js";
import * as accountsService from "./service.js";

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

accountsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const accounts = await accountsService.listUserAccounts(req.auth!.userId);
    res.status(200).json(accounts);
  }),
);

accountsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createAccountSchema.parse(req.body);
    const account = await accountsService.createSharedAccount(req.auth!.userId, body.name);
    res.status(201).json(account);
  }),
);

accountsRouter.post(
  "/join",
  asyncHandler(async (req, res) => {
    const body = joinByCodeSchema.parse(req.body);
    const account = await accountsService.joinByInviteCode(req.auth!.userId, body.code);
    res.status(200).json(account);
  }),
);

accountsRouter.post(
  "/:accountId/invite-codes",
  asyncHandler(async (req, res) => {
    const params = accountIdParamsSchema.parse(req.params);
    const invite = await accountsService.generateInviteCode(req.auth!.userId, params.accountId);
    res.status(200).json(invite);
  }),
);

accountsRouter.post(
  "/:accountId/leave",
  asyncHandler(async (req, res) => {
    const params = accountIdParamsSchema.parse(req.params);
    await accountsService.leaveAccount(req.auth!.userId, params.accountId);
    res.status(204).send();
  }),
);

accountsRouter.get(
  "/:accountId/members",
  asyncHandler(async (req, res) => {
    const params = accountIdParamsSchema.parse(req.params);
    const members = await accountsService.listMembers(req.auth!.userId, params.accountId);
    res.status(200).json(members);
  }),
);

accountsRouter.patch(
  "/:accountId/members/:userId/role",
  asyncHandler(async (req, res) => {
    const params = memberParamsSchema.parse(req.params);
    const body = updateRoleSchema.parse(req.body);
    const member = await accountsService.updateMemberRole(
      req.auth!.userId,
      params.accountId,
      params.userId,
      body.role,
    );
    res.status(200).json(member);
  }),
);

accountsRouter.delete(
  "/:accountId/members/:userId",
  asyncHandler(async (req, res) => {
    const params = memberParamsSchema.parse(req.params);
    await accountsService.removeMember(req.auth!.userId, params.accountId, params.userId);
    res.status(204).send();
  }),
);
