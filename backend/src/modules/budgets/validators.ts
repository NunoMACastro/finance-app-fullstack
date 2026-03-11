import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");

export const monthParamSchema = z.object({
  month: monthKey,
});

export const copyBudgetParamsSchema = z.object({
  month: monthKey,
  sourceMonth: monthKey,
});

export const categoryParamsSchema = z.object({
  month: monthKey,
  categoryId: z.string().min(1),
});

export const budgetCategorySchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  percent: z.number().min(0).max(100),
});

export const saveBudgetSchema = z.object({
  totalBudget: z.number().nonnegative(),
  categories: z.array(budgetCategorySchema),
});

export const addCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  percent: z.number().min(0).max(100),
});
