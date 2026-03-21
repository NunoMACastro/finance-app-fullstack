import { Schema, model, Types, type InferSchemaType } from "mongoose";

const statsInsightSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    requestedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    periodType: {
      type: String,
      enum: ["semester", "year"],
      required: true,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    forecastWindow: {
      type: Number,
      enum: [3, 6],
      required: true,
    },
    inputHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "ready", "failed"],
      required: true,
      index: true,
    },
    stale: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    model: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: null,
    },
    highlights: {
      type: [
        {
          title: { type: String, required: true },
          detail: { type: String, required: true },
          severity: {
            type: String,
            enum: ["info", "warning", "positive"],
            required: true,
          },
        },
      ],
      default: [],
    },
    risks: {
      type: [
        {
          title: { type: String, required: true },
          detail: { type: String, required: true },
          severity: {
            type: String,
            enum: ["warning", "high"],
            required: true,
          },
        },
      ],
      default: [],
    },
    actions: {
      type: [
        {
          title: { type: String, required: true },
          detail: { type: String, required: true },
          priority: {
            type: String,
            enum: ["high", "medium", "low"],
            required: true,
          },
        },
      ],
      default: [],
    },
    categoryInsights: {
      type: [
        {
          categoryId: { type: String, required: true },
          categoryAlias: { type: String, required: true },
          categoryKind: {
            type: String,
            enum: ["expense", "reserve"],
            required: true,
          },
          categoryName: { type: String, required: true },
          colorSlot: { type: Number, min: 1, max: 9, default: null },
          title: { type: String, required: true },
          detail: { type: String, required: true },
          action: { type: String, default: null },
        },
      ],
      default: [],
    },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: null,
    },
    limitations: {
      type: [String],
      default: [],
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
    categoryMappings: {
      type: [
        {
          alias: { type: String, required: true },
          categoryId: { type: String, required: true },
          categoryName: { type: String, required: true },
          categoryKind: {
            type: String,
            enum: ["expense", "reserve", "income"],
            required: true,
          },
          colorSlot: { type: Number, min: 1, max: 9, default: null },
        },
      ],
      default: [],
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

statsInsightSchema.index({
  accountId: 1,
  periodType: 1,
  periodKey: 1,
  forecastWindow: 1,
  createdAt: -1,
});

statsInsightSchema.index({
  accountId: 1,
  periodType: 1,
  periodKey: 1,
  forecastWindow: 1,
  inputHash: 1,
  stale: 1,
  status: 1,
});

export type StatsInsightDocument = InferSchemaType<typeof statsInsightSchema> & {
  accountId: Types.ObjectId;
  requestedByUserId: Types.ObjectId;
};

export const StatsInsightModel = model<StatsInsightDocument>("StatsInsight", statsInsightSchema);
