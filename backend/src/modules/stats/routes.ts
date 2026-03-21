import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/async-handler.js";
import { env } from "../../config/env.js";
import { requireFinancialReadAccess, requireStrictAccountContext } from "../../middleware/account-context.js";
import { requireAuth } from "../../middleware/auth.js";
import * as statsService from "./service.js";
import {
  compareQuerySchema,
  createInsightSchema,
  latestInsightQuerySchema,
  semesterQuerySchema,
  statsInsightParamsSchema,
  yearQuerySchema,
} from "./validators.js";

export const statsRouter = Router();

const statsInsightLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(Math.floor(env.RATE_LIMIT_MAX / 3), 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Muitos pedidos de insight IA. Tente novamente daqui a pouco.",
  },
});

statsRouter.use(requireAuth);
statsRouter.use(requireStrictAccountContext);
statsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.vary("Authorization");
  res.vary("X-Account-Id");
  next();
});

statsRouter.get(
  "/semester",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = semesterQuerySchema.parse(req.query);
    const data = await statsService.getSemesterStats(
      req.auth!.accountId!,
      query.endingMonth,
      (query.forecastWindow as 3 | 6 | undefined) ?? 3,
      query.includeInsight ?? false,
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
      query.includeInsight ?? false,
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

statsRouter.post(
  "/insights",
  requireFinancialReadAccess,
  statsInsightLimiter,
  asyncHandler(async (req, res) => {
    const input = createInsightSchema.parse(req.body ?? {});
    const data = await statsService.requestStatsInsight(req.auth!.accountId!, req.auth!.userId, input);
    res.status(data.status === "ready" ? 200 : 202).json(data);
  }),
);

statsRouter.get(
  "/insights/latest",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const query = latestInsightQuerySchema.parse(req.query);
    const data = await statsService.getLatestStatsInsight(req.auth!.accountId!, query);
    if (!data) {
      res.status(404).json({
        code: "STATS_INSIGHT_NOT_FOUND",
        message: "Ainda não existe insight IA para este período.",
      });
      return;
    }
    res.status(200).json(data);
  }),
);

statsRouter.get(
  "/insights/:id",
  requireFinancialReadAccess,
  asyncHandler(async (req, res) => {
    const params = statsInsightParamsSchema.parse(req.params);
    const data = await statsService.getStatsInsightById(req.auth!.accountId!, params.id);
    if (!data) {
      res.status(404).json({
        code: "STATS_INSIGHT_NOT_FOUND",
        message: "Insight IA não encontrado.",
      });
      return;
    }
    res.status(200).json(data);
  }),
);
