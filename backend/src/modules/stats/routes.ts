import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAccountContext, requireFinancialReadAccess } from "../../middleware/account-context.js";
import { requireAuth } from "../../middleware/auth.js";
import * as statsService from "./service.js";
import { compareQuerySchema, semesterQuerySchema, yearQuerySchema } from "./validators.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);
statsRouter.use(requireAccountContext);

statsRouter.get(
  "/semester",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = semesterQuerySchema.parse(req.query);
    const data = await statsService.getSemesterStats(
      req.auth!.accountId!,
      query.endingMonth,
      (query.forecastWindow as 3 | 6 | undefined) ?? 3,
    );
    res.status(200).json(data);
  }),
);

statsRouter.get(
  "/year",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = yearQuerySchema.parse(req.query);
    const data = await statsService.getYearStats(
      req.auth!.accountId!,
      query.year,
      (query.forecastWindow as 3 | 6 | undefined) ?? 3,
    );
    res.status(200).json(data);
  }),
);

statsRouter.get(
  "/compare-budget",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = compareQuerySchema.parse(req.query);
    const data = await statsService.compareBudget(req.auth!.accountId!, query.from, query.to);
    res.status(200).json(data);
  }),
);
