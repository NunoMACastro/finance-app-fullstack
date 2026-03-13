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
    },
    preferences: {
      themePalette: {
        type: String,
        enum: ["brisa", "calma", "aurora", "terra"],
        default: "brisa",
      },
      hideAmountsByDefault: {
        type: Boolean,
        default: false,
      },
    },
    tutorialSeenAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    personalAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = model<UserDocument>("User", userSchema);
