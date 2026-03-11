import { Schema, model, Types, type InferSchemaType } from "mongoose";

const statsSnapshotSchema = new Schema(
  {
    userId: {
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
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

statsSnapshotSchema.index({ userId: 1, periodType: 1, periodKey: 1 }, { unique: true });

export type StatsSnapshotDocument = InferSchemaType<typeof statsSnapshotSchema> & {
  userId: Types.ObjectId;
};

export const StatsSnapshotModel = model<StatsSnapshotDocument>("StatsSnapshot", statsSnapshotSchema);
