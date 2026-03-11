import { Schema, model, Types, type InferSchemaType } from "mongoose";

const accountMembershipSchema = new Schema(
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
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

accountMembershipSchema.index({ accountId: 1, userId: 1 }, { unique: true });
accountMembershipSchema.index({ userId: 1, status: 1 });

export type AccountMembershipDocument = InferSchemaType<typeof accountMembershipSchema> & {
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
};

export const AccountMembershipModel = model<AccountMembershipDocument>(
  "AccountMembership",
  accountMembershipSchema,
);
