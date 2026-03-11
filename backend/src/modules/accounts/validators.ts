import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "invalid object id");

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const accountIdParamsSchema = z.object({
  accountId: objectId,
});

export const memberParamsSchema = z.object({
  accountId: objectId,
  userId: objectId,
});

export const joinByCodeSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export const updateRoleSchema = z.object({
  role: z.enum(["owner", "editor", "viewer"]),
});
