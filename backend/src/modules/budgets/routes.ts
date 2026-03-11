import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  requireAccountContext,
  requireFinancialReadAccess,
  requireFinancialWriteAccess,
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

budgetsRouter.use(requireAuth);
budgetsRouter.use(requireAccountContext);

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
