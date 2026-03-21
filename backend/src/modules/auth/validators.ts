import { z } from "zod";

const themePaletteSchema = z
  .enum(["brisa", "calma", "aurora", "terra", "mare", "amber", "ciano"])
  .or(z.literal("ambar"))
  .transform((value) => (value === "ambar" ? "amber" : value));
const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(["EUR", "USD", "GBP", "BRL", "CHF"]));

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).max(256),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(256),
  })
  .strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
}).passthrough();

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
}).passthrough();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    currency: currencySchema.optional(),
    preferences: z
      .object({
        themePalette: themePaletteSchema.optional(),
        hideAmountsByDefault: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.currency !== undefined ||
      value.preferences !== undefined,
    {
      message: "Pelo menos um campo deve ser enviado",
      path: ["root"],
    },
  );

export const updateEmailSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newEmail: z.string().trim().email().max(254),
  })
  .strict();

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(10).max(256),
  })
  .strict();

export const sessionJtiParamsSchema = z
  .object({
    jti: z.string().trim().min(1).max(200),
  })
  .strict();

export const resetTutorialSchema = z.object({}).passthrough();
export const revokeAllSessionsSchema = z.object({}).passthrough();

export const deleteMeSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
  })
  .strict();
