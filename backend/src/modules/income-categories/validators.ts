import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "invalid object id");

export const incomeCategoryIdParamsSchema = z.object({
  id: objectId,
});

export const createIncomeCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateIncomeCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
