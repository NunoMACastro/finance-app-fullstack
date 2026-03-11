import { Schema, model, Types, type InferSchemaType } from "mongoose";

const budgetCategorySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const budgetSchema = new Schema(
  {
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

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export type BudgetCategory = InferSchemaType<typeof budgetCategorySchema>;

export type BudgetDocument = InferSchemaType<typeof budgetSchema> & {
  userId: Types.ObjectId;
};

export const BudgetModel = model<BudgetDocument>("Budget", budgetSchema);
