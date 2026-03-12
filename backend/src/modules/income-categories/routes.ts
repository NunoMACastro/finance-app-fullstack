import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  requireAccountContext,
  requireFinancialReadAccess,
  requireFinancialWriteAccess,
} from "../../middleware/account-context.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createIncomeCategorySchema,
  incomeCategoryIdParamsSchema,
  updateIncomeCategorySchema,
} from "./validators.js";
import * as incomeCategoriesService from "./service.js";

export const incomeCategoriesRouter = Router();

incomeCategoriesRouter.use(requireAuth);
incomeCategoriesRouter.use(requireAccountContext);

incomeCategoriesRouter.get(
  "/",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const categories = await incomeCategoriesService.listIncomeCategories(req.auth!.accountId!);
    res.status(200).json(categories);
  }),
);

incomeCategoriesRouter.post(
  "/",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const body = createIncomeCategorySchema.parse(req.body);
    const category = await incomeCategoriesService.createIncomeCategory(req.auth!.accountId!, body);
    res.status(201).json(category);
  }),
);

incomeCategoriesRouter.patch(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = incomeCategoryIdParamsSchema.parse(req.params);
    const body = updateIncomeCategorySchema.parse(req.body);
    const updated = await incomeCategoriesService.updateIncomeCategory(
      req.auth!.accountId!,
      params.id,
      body,
    );
    res.status(200).json(updated);
  }),
);

incomeCategoriesRouter.delete(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = incomeCategoryIdParamsSchema.parse(req.params);
    await incomeCategoriesService.softDeleteIncomeCategory(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);
