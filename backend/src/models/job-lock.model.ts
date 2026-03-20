import { Schema, model } from "mongoose";

const jobLockSchema = new Schema(
  {
    jobName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
    },
    lockedUntil: {
      type: Date,
      required: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const JobLockModel = model("JobLock", jobLockSchema);
