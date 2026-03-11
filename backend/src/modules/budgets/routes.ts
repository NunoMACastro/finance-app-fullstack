import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
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

budgetsRouter.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    const templates = budgetsService.getBudgetTemplates();
    res.status(200).json(templates);
  }),
);

budgetsRouter.get(
  "/:month",
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const budget = await budgetsService.getBudget(req.auth!.userId, params.month);
    res.status(200).json(budget);
  }),
);

budgetsRouter.put(
  "/:month",
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const body = saveBudgetSchema.parse(req.body);
    const budget = await budgetsService.saveBudget(req.auth!.userId, params.month, body);
    res.status(200).json(budget);
  }),
);

budgetsRouter.post(
  "/:month/categories",
  asyncHandler(async (req, res) => {
    const params = monthParamSchema.parse(req.params);
    const body = addCategorySchema.parse(req.body);
    const budget = await budgetsService.addCategory(req.auth!.userId, params.month, body);
    res.status(200).json(budget);
  }),
);

budgetsRouter.delete(
  "/:month/categories/:categoryId",
  asyncHandler(async (req, res) => {
    const params = categoryParamsSchema.parse(req.params);
    const budget = await budgetsService.removeCategory(req.auth!.userId, params.month, params.categoryId);
    res.status(200).json(budget);
  }),
);

budgetsRouter.post(
  "/:month/copy-from/:sourceMonth",
  asyncHandler(async (req, res) => {
    const params = copyBudgetParamsSchema.parse(req.params);
    const budget = await budgetsService.copyBudgetFromMonth(
      req.auth!.userId,
      params.month,
      params.sourceMonth,
    );
    res.status(200).json(budget);
  }),
);
