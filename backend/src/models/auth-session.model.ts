import { Schema, model, Types, type InferSchemaType } from "mongoose";

const authSessionSchema = new Schema(
  {
    sid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked", "compromised"],
      required: true,
      default: "active",
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    compromisedAt: {
      type: Date,
      default: null,
    },
    currentRefreshJti: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastSeenAt: {
      type: Date,
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

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type AuthSessionDocument = InferSchemaType<typeof authSessionSchema> & {
  userId: Types.ObjectId;
};

export const AuthSessionModel = model<AuthSessionDocument>("AuthSession", authSessionSchema);
