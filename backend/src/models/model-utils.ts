import type { HydratedDocument } from "mongoose";

export function withId<T extends { _id: unknown }>(doc: HydratedDocument<T> | (T & { _id: unknown })) {
  const plain = "toObject" in doc ? doc.toObject() : doc;
  const { _id, ...rest } = plain as Record<string, unknown>;
  return {
    id: String(_id),
    ...rest,
  };
}
