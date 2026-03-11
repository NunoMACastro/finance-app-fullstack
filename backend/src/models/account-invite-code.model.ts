import { Schema, model, Types, type InferSchemaType } from "mongoose";

const accountInviteCodeSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

accountInviteCodeSchema.index({ accountId: 1, revokedAt: 1, expiresAt: 1 });

export type AccountInviteCodeDocument = InferSchemaType<typeof accountInviteCodeSchema> & {
  accountId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
};

export const AccountInviteCodeModel = model<AccountInviteCodeDocument>(
  "AccountInviteCode",
  accountInviteCodeSchema,
);
