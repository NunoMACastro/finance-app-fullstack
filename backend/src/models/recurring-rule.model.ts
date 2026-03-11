import { Schema, model, Types, type InferSchemaType } from "mongoose";

const recurringRuleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dayOfMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
    startMonth: {
      type: String,
      required: true,
      index: true,
    },
    endMonth: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

recurringRuleSchema.index({ userId: 1, active: 1, startMonth: 1 });

export type RecurringRuleDocument = InferSchemaType<typeof recurringRuleSchema> & {
  userId: Types.ObjectId;
};

export const RecurringRuleModel = model<RecurringRuleDocument>("RecurringRule", recurringRuleSchema);
