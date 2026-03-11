import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createTransactionSchema,
  monthSummaryQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from "./validators.js";
import * as transactionsService from "./service.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = monthSummaryQuerySchema.parse(req.query);
    const summary = await transactionsService.getMonthSummary(req.auth!.userId, query.month);
    res.status(200).json(summary);
  }),
);

transactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createTransactionSchema.parse(req.body);
    const created = await transactionsService.createTransaction(req.auth!.userId, body);
    res.status(201).json(created);
  }),
);

transactionsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = transactionIdParamSchema.parse(req.params);
    const body = updateTransactionSchema.parse(req.body);
    const updated = await transactionsService.updateTransaction(req.auth!.userId, params.id, body);
    res.status(200).json(updated);
  }),
);

transactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = transactionIdParamSchema.parse(req.params);
    await transactionsService.deleteTransaction(req.auth!.userId, params.id);
    res.status(204).send();
  }),
);
