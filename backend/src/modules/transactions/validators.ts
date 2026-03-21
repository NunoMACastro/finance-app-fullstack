import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "invalid object id");

export const monthSummaryQuerySchema = z.object({
  month: monthKey,
});

export const transactionListQuerySchema = z.object({
  month: monthKey,
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().trim().min(1).max(120).optional(),
  origin: z.enum(["manual", "recurring"]).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createTransactionSchema = z
  .object({
    month: monthKey,
    date: z.string().date(),
    type: z.enum(["income", "expense"]),
    description: z.string().trim().min(1).max(240),
    amount: z.number().nonnegative(),
    categoryId: z.string().trim().max(120).optional(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    date: z.string().date().optional(),
    type: z.enum(["income", "expense"]).optional(),
    description: z.string().trim().min(1).max(240).optional(),
    amount: z.number().nonnegative().optional(),
    categoryId: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const transactionIdParamSchema = z.object({
  id: objectId,
});
