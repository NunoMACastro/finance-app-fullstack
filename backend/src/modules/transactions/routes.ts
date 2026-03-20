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
  createTransactionSchema,
  monthSummaryQuerySchema,
  transactionListQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from "./validators.js";
import * as transactionsService from "./service.js";

export const transactionsRouter = Router();

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

transactionsRouter.use(requireAuth);
transactionsRouter.use(requireStrictAccountContext);

transactionsRouter.get(
  "/",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const isFilteredListRequest = [
      "type",
      "categoryId",
      "origin",
      "dateFrom",
      "dateTo",
      "cursor",
      "limit",
    ].some((key) => key in req.query);

    if (isFilteredListRequest) {
      const query = transactionListQuerySchema.parse(req.query);
      const result = await transactionsService.listTransactions(req.auth!.accountId!, query);
      res.status(200).json(result);
      return;
    }

    const query = monthSummaryQuerySchema.parse(req.query);
    const summary = await transactionsService.getMonthSummary(req.auth!.accountId!, query.month);
    res.status(200).json(summary);
  }),
);

transactionsRouter.post(
  "/",
  requireFinancialWriteAccess,
  financialWriteLimiter,
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
  financialWriteLimiter,
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
  financialWriteLimiter,
  asyncHandler(async (req, res) => {
    const params = transactionIdParamSchema.parse(req.params);
    await transactionsService.deleteTransaction(req.auth!.accountId!, params.id);
    res.status(204).send();
  }),
);
