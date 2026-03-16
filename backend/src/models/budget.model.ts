import { Schema, model, Types, type InferSchemaType } from "mongoose";

const budgetCategorySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
    colorSlot: { type: Number, min: 1, max: 9 },
  },
  { _id: false },
);

const budgetSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    categories: {
      type: [budgetCategorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

budgetSchema.index({ accountId: 1, month: 1 }, { unique: true });

export type BudgetCategory = InferSchemaType<typeof budgetCategorySchema>;

export type BudgetDocument = InferSchemaType<typeof budgetSchema> & {
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
};

export const BudgetModel = model<BudgetDocument>("Budget", budgetSchema);
