import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/async-handler.js";
import { env } from "../../config/env.js";
import {
  requireFinancialReadAccess,
  requireFinancialWriteAccess,
  requireStrictAccountContext,
} from "../../middleware/account-context.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createRecurringSchema,
  generateRecurringQuerySchema,
  reassignRecurringCategorySchema,
  recurringIdParamSchema,
  updateRecurringSchema,
} from "./validators.js";
import * as recurringService from "./service.js";

export const recurringRouter = Router();

const financialWriteLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(Math.floor(env.RATE_LIMIT_MAX / 2), 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Muitos pedidos de escrita financeira. Tente novamente daqui a pouco.",
  },
});

recurringRouter.use(requireAuth);
recurringRouter.use(requireStrictAccountContext);

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
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = createRecurringSchema.parse(req.body);
    const rule = await recurringService.createRule(req.auth!.accountId!, req.auth!.userId, body);
    res.status(201).json(rule);
  }),
);

recurringRouter.put(
  "/:id",
  requireFinancialWriteAccess,
  financialWriteLimiter,
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
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    await recurringService.deleteRule(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);

recurringRouter.post(
  "/:id/reassign-category",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = recurringIdParamSchema.parse(req.params);
    const body = reassignRecurringCategorySchema.parse(req.body);
    const result = await recurringService.reassignRuleCategory(
      req.auth!.accountId!,
      req.auth!.userId,
      params.id,
      body,
    );
    res.status(200).json(result);
  }),
);

recurringRouter.post(
  "/generate",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const query = generateRecurringQuerySchema.parse(req.query);
    const result = await recurringService.generateForAccountMonth(req.auth!.accountId!, query.month);
    res.status(200).json(result);
  }),
);
