import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as statsService from "./service.js";
import { compareQuerySchema, semesterQuerySchema, yearQuerySchema } from "./validators.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get(
  "/semester",
  asyncHandler(async (req, res) => {
    const query = semesterQuerySchema.parse(req.query);
    const data = await statsService.getSemesterStats(req.auth!.userId, query.endingMonth);
    res.status(200).json(data);
  }),
);

statsRouter.get(
  "/year",
  asyncHandler(async (req, res) => {
    const query = yearQuerySchema.parse(req.query);
    const data = await statsService.getYearStats(req.auth!.userId, query.year);
    res.status(200).json(data);
  }),
);

statsRouter.get(
  "/compare-budget",
  asyncHandler(async (req, res) => {
    const query = compareQuerySchema.parse(req.query);
    const data = await statsService.compareBudget(req.auth!.userId, query.from, query.to);
    res.status(200).json(data);
  }),
);
