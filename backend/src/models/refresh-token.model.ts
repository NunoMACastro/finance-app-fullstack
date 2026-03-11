import { Schema, model, Types, type InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    jti: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByJti: {
      type: String,
      default: null,
    },
    deviceInfo: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({ userId: 1, jti: 1 }, { unique: true });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & {
  userId: Types.ObjectId;
};

export const RefreshTokenModel = model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema);
