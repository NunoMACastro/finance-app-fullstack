import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profile: {
      name: { type: String, required: true, trim: true },
      currency: { type: String, default: "EUR" },
      locale: { type: String, default: "pt-PT" },
    },
    tutorialSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = model<UserDocument>("User", userSchema);
