import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");
const forecastWindow = z.coerce.number().int().refine((value) => value === 3 || value === 6, {
  message: "forecastWindow must be 3 or 6",
});
const includeInsight = z
  .preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    return value;
  }, z.boolean())
  .optional();

export const semesterQuerySchema = z.object({
  endingMonth: monthKey.optional(),
  forecastWindow: forecastWindow.optional(),
  includeInsight,
});

export const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999).optional(),
  forecastWindow: forecastWindow.optional(),
  includeInsight,
});

export const compareQuerySchema = z.object({
  from: monthKey,
  to: monthKey,
});
