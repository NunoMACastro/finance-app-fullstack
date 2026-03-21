import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "invalid object id");

export const recurringIdParamSchema = z.object({
  id: objectId,
});

export const createRecurringSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    name: z.string().trim().min(1).max(180),
    amount: z.number().nonnegative(),
    dayOfMonth: z.number().int().min(1).max(31),
    categoryId: z.string().trim().max(120).optional(),
    startMonth: monthKey,
    endMonth: monthKey.optional(),
  })
  .strict()
  .refine((data) => !data.endMonth || data.endMonth >= data.startMonth, {
    message: "endMonth must be >= startMonth",
    path: ["endMonth"],
  });

export const updateRecurringSchema = z
  .object({
    name: z.string().trim().min(1).max(180).optional(),
    amount: z.number().nonnegative().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    categoryId: z.string().trim().min(1).max(120).optional(),
    endMonth: monthKey.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const generateRecurringQuerySchema = z.object({
  month: monthKey,
});

export const reassignRecurringCategorySchema = z
  .object({
    categoryId: z.string().trim().min(1).max(120),
    migratePastFallbackTransactions: z.boolean().default(false),
  })
  .strict();
