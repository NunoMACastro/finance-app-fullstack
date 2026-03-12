import { Schema, model, Types, type InferSchemaType } from "mongoose";

const incomeCategorySchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    nameNormalized: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

incomeCategorySchema.index(
  { accountId: 1, nameNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  },
);

incomeCategorySchema.index(
  { accountId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  },
);

export type IncomeCategoryDocument = InferSchemaType<typeof incomeCategorySchema> & {
  accountId: Types.ObjectId;
};

export const IncomeCategoryModel = model<IncomeCategoryDocument>("IncomeCategory", incomeCategorySchema);
