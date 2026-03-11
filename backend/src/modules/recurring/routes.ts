import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createRecurringSchema,
  generateRecurringQuerySchema,
  recurringIdParamSchema,
  updateRecurringSchema,
} from "./validators.js";
import * as recurringService from "./service.js";

export const recurringRouter = Router();

recurringRouter.use(requireAuth);

recurringRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rules = await recurringService.listRules(req.auth!.userId);
    res.status(200).json(rules);
  }),
);

recurringRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createRecurringSchema.parse(req.body);
    const rule = await recurringService.createRule(req.auth!.userId, body);
    res.status(201).json(rule);
  }),
);

recurringRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    const body = updateRecurringSchema.parse(req.body);
    const rule = await recurringService.updateRule(req.auth!.userId, params.id, body);
    res.status(200).json(rule);
  }),
);

recurringRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    await recurringService.deleteRule(req.auth!.userId, params.id);
    res.status(204).send();
  }),
);

recurringRouter.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const query = generateRecurringQuerySchema.parse(req.query);
    const result = await recurringService.generateForUserMonth(req.auth!.userId, query.month);
    res.status(200).json(result);
  }),
);
