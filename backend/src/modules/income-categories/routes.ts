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
  createIncomeCategorySchema,
  incomeCategoryIdParamsSchema,
  updateIncomeCategorySchema,
} from "./validators.js";
import * as incomeCategoriesService from "./service.js";

export const incomeCategoriesRouter = Router();

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

incomeCategoriesRouter.use(requireAuth);
incomeCategoriesRouter.use(requireStrictAccountContext);

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
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = createIncomeCategorySchema.parse(req.body);
    const category = await incomeCategoriesService.createIncomeCategory(req.auth!.accountId!, body);
    res.status(201).json(category);
  }),
);

incomeCategoriesRouter.patch(
  "/:id",
  requireFinancialWriteAccess,
  financialWriteLimiter,
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
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = incomeCategoryIdParamsSchema.parse(req.params);
    await incomeCategoriesService.softDeleteIncomeCategory(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);
