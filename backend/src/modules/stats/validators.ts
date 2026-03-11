import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");

export const semesterQuerySchema = z.object({
  endingMonth: monthKey.optional(),
});

export const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999).optional(),
});

export const compareQuerySchema = z.object({
  from: monthKey,
  to: monthKey,
});
