import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  requireAccountContext,
  requireFinancialReadAccess,
  requireFinancialWriteAccess,
} from "../../middleware/account-context.js";
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
recurringRouter.use(requireAccountContext);

recurringRouter.get(
  "/",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const rules = await recurringService.listRules(req.auth!.accountId!);
    res.status(200).json(rules);
  }),
);

recurringRouter.post(
  "/",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const body = createRecurringSchema.parse(req.body);
    const rule = await recurringService.createRule(req.auth!.accountId!, req.auth!.userId, body);
    res.status(201).json(rule);
  }),
);

recurringRouter.put(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    const body = updateRecurringSchema.parse(req.body);
    const rule = await recurringService.updateRule(
      req.auth!.accountId!,
      req.auth!.userId,
      params.id,
      body,
    );
    res.status(200).json(rule);
  }),
);

recurringRouter.delete(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    await recurringService.deleteRule(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);

recurringRouter.post(
  "/generate",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const query = generateRecurringQuerySchema.parse(req.query);
    const result = await recurringService.generateForAccountMonth(req.auth!.accountId!, query.month);
    res.status(200).json(result);
  }),
);
