import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");

export const monthSummaryQuerySchema = z.object({
  month: monthKey,
});

export const createTransactionSchema = z.object({
  month: monthKey,
  date: z.string().date(),
  type: z.enum(["income", "expense"]),
  origin: z.enum(["manual", "recurring"]),
  recurringRuleId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  description: z.string().trim().min(1).max(240),
  amount: z.number().nonnegative(),
  categoryId: z.string().trim().min(1).max(120),
});

export const updateTransactionSchema = z
  .object({
    date: z.string().date().optional(),
    type: z.enum(["income", "expense"]).optional(),
    description: z.string().trim().min(1).max(240).optional(),
    amount: z.number().nonnegative().optional(),
    categoryId: z.string().trim().min(1).max(120).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const transactionIdParamSchema = z.object({
  id: z.string().min(1),
});
