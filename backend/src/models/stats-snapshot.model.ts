import { Schema, model, Types, type InferSchemaType } from "mongoose";

const statsSnapshotSchema = new Schema(
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
      default: null,
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
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

statsSnapshotSchema.index({ accountId: 1, periodType: 1, periodKey: 1 }, { unique: true });

export type StatsSnapshotDocument = InferSchemaType<typeof statsSnapshotSchema> & {
  accountId: Types.ObjectId;
  userId: Types.ObjectId | null;
};

export const StatsSnapshotModel = model<StatsSnapshotDocument>("StatsSnapshot", statsSnapshotSchema);
