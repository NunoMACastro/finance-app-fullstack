import { createHash, randomUUID } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newId(): string {
  return randomUUID();
}

export function newCategoryId(): string {
  return `cat_${randomUUID().slice(0, 8)}`;
}
