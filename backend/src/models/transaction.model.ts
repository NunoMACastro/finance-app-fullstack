import { Schema, model, Types, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
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
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    origin: {
      type: String,
      enum: ["manual", "recurring"],
      required: true,
    },
    recurringRuleId: {
      type: Schema.Types.ObjectId,
      ref: "RecurringRule",
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ userId: 1, month: 1 });
transactionSchema.index(
  { userId: 1, recurringRuleId: 1, month: 1 },
  { unique: true, partialFilterExpression: { recurringRuleId: { $type: "objectId" } } },
);

export type TransactionDocument = InferSchemaType<typeof transactionSchema> & {
  userId: Types.ObjectId;
  recurringRuleId: Types.ObjectId | null;
};

export const TransactionModel = model<TransactionDocument>("Transaction", transactionSchema);
