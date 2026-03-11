import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  requireAccountContext,
  requireFinancialReadAccess,
  requireFinancialWriteAccess,
} from "../../middleware/account-context.js";
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
transactionsRouter.use(requireAccountContext);

transactionsRouter.get(
  "/",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = monthSummaryQuerySchema.parse(req.query);
    const summary = await transactionsService.getMonthSummary(req.auth!.accountId!, query.month);
    res.status(200).json(summary);
  }),
);

transactionsRouter.post(
  "/",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const body = createTransactionSchema.parse(req.body);
    const created = await transactionsService.createTransaction(
      req.auth!.accountId!,
      req.auth!.userId,
      body,
    );
    res.status(201).json(created);
  }),
);

transactionsRouter.put(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = transactionIdParamSchema.parse(req.params);
    const body = updateTransactionSchema.parse(req.body);
    const updated = await transactionsService.updateTransaction(
      req.auth!.accountId!,
      req.auth!.userId,
      params.id,
      body,
    );
    res.status(200).json(updated);
  }),
);

transactionsRouter.delete(
  "/:id",
  requireFinancialWriteAccess,
  asyncHandler(async (req, res) => {
    const params = transactionIdParamSchema.parse(req.params);
    await transactionsService.deleteTransaction(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);
