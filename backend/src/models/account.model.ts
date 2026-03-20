import { Schema, model, Types, type InferSchemaType } from "mongoose";

const accountSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["personal", "shared"],
      required: true,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activeOwnerCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    activeInviteCodeId: {
      type: Schema.Types.ObjectId,
      ref: "AccountInviteCode",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

accountSchema.index(
  { createdByUserId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "personal" },
  },
);

export type AccountDocument = InferSchemaType<typeof accountSchema> & {
  createdByUserId: Types.ObjectId;
  activeInviteCodeId: Types.ObjectId | null;
};

export const AccountModel = model<AccountDocument>("Account", accountSchema);
