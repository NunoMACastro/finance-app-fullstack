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
  addCategorySchema,
  categoryParamsSchema,
  copyBudgetParamsSchema,
  monthParamSchema,
  saveBudgetSchema,
} from "./validators.js";
import * as budgetsService from "./service.js";

export const budgetsRouter = Router();

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

budgetsRouter.use(requireAuth);
budgetsRouter.use(requireStrictAccountContext);

budgetsRouter.get(
  "/templates",
  requireFinancialReadAccess,
  asyncHandler(async (_req, res) => {
    const templates = budgetsService.getBudgetTemplates();
    res.status(200).json(templates);
  }),
);

budgetsRouter.get(
  "/:month",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const budget = await budgetsService.getBudget(req.auth!.accountId!, params.month);
    res.status(200).json(budget);
  }),
);

budgetsRouter.put(
  "/:month",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const body = saveBudgetSchema.parse(req.body);
    const budget = await budgetsService.saveBudget(
      req.auth!.accountId!,
      params.month,
      body,
      req.auth!.userId,
    );
    res.status(200).json(budget);
  }),
);

budgetsRouter.post(
  "/:month/categories",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const body = addCategorySchema.parse(req.body);
    const budget = await budgetsService.addCategory(
      req.auth!.accountId!,
      params.month,
      body,
      req.auth!.userId,
    );
    res.status(200).json(budget);
  }),
);

budgetsRouter.delete(
  "/:month/categories/:categoryId",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = categoryParamsSchema.parse(req.params);
    const budget = await budgetsService.removeCategory(
      req.auth!.accountId!,
      params.month,
      params.categoryId,
      req.auth!.userId,
    );
    res.status(200).json(budget);
  }),
);

budgetsRouter.post(
  "/:month/copy-from/:sourceMonth",
  requireFinancialWriteAccess,
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = copyBudgetParamsSchema.parse(req.params);
    const budget = await budgetsService.copyBudgetFromMonth(
      req.auth!.accountId!,
      params.month,
      params.sourceMonth,
      req.auth!.userId,
    );
    res.status(200).json(budget);
  }),
);
