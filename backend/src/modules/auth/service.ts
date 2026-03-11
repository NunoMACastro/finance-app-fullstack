import type { Request } from "express";
import mongoose, { Types } from "mongoose";
import { env } from "../../config/env.js";
import { conflict, notFound, unauthorized } from "../../lib/api-error.js";
import { newId, sha256 } from "../../lib/hash.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { AccountMembershipModel } from "../../models/account-membership.model.js";
import { AccountModel } from "../../models/account.model.js";
import { RefreshTokenModel } from "../../models/refresh-token.model.js";
import { UserModel } from "../../models/user.model.js";
import { ensurePersonalAccountForUser } from "../accounts/service.js";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  currency: string;
  locale: string;
  tutorialSeenAt: string | null;
  personalAccountId: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  tokens: TokenPair;
  user: UserProfile;
}

function toUserProfile(user: {
  _id: Types.ObjectId;
  email: string;
  profile?: { name?: string; currency?: string; locale?: string } | null;
  tutorialSeenAt?: Date | null;
  personalAccountId?: Types.ObjectId | string | null;
}): UserProfile {
  const profile = user.profile ?? {};
  const personalAccountId =
    typeof user.personalAccountId === "string"
      ? user.personalAccountId
      : user.personalAccountId?.toString() ?? "";

  return {
    id: user._id.toString(),
    email: user.email,
    name: profile.name ?? "",
    currency: profile.currency ?? "EUR",
    locale: profile.locale ?? "pt-PT",
    tutorialSeenAt: user.tutorialSeenAt ? user.tutorialSeenAt.toISOString() : null,
    personalAccountId,
  };
}

async function issueTokenPair(userId: string, req?: Request): Promise<TokenPair> {
  const jti = newId();
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);

  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const deviceInfo = req?.get("user-agent") ?? null;

  await RefreshTokenModel.create({
    userId,
    jti,
    tokenHash: sha256(refreshToken),
    expiresAt,
    deviceInfo,
  });

  return { accessToken, refreshToken };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}, req?: Request): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const trimmedName = input.name.trim();
  const passwordHash = await hashPassword(input.password);

  const userId = new Types.ObjectId();
  const personalAccountId = new Types.ObjectId();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await UserModel.findOne({ email }).session(session).lean();
      if (existing) {
        conflict("Email ja registado", "EMAIL_ALREADY_USED");
      }

      await AccountModel.create(
        [
          {
            _id: personalAccountId,
            name: `${trimmedName} (Pessoal)`,
            type: "personal",
            createdByUserId: userId,
          },
        ],
        { session },
      );

      await AccountMembershipModel.create(
        [
          {
            accountId: personalAccountId,
            userId,
            role: "owner",
            status: "active",
            leftAt: null,
          },
        ],
        { session },
      );

      await UserModel.create(
        [
          {
            _id: userId,
            email,
            passwordHash,
            profile: {
              name: trimmedName,
              currency: "EUR",
              locale: "pt-PT",
            },
            personalAccountId,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const tokens = await issueTokenPair(userId.toString(), req);
  return {
    tokens,
    user: toUserProfile({
      _id: userId,
      email,
      profile: {
        name: trimmedName,
        currency: "EUR",
        locale: "pt-PT",
      },
      tutorialSeenAt: null,
      personalAccountId,
    }),
  };
}

export async function login(input: {
  email: string;
  password: string;
}, req?: Request): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const user = await UserModel.findOne({ email });
  if (!user) {
    unauthorized("Credenciais invalidas", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    unauthorized("Credenciais invalidas", "INVALID_CREDENTIALS");
  }

  const personalAccountId = await ensurePersonalAccountForUser(
    user._id.toString(),
    user.profile?.name ?? "",
  );

  const tokens = await issueTokenPair(user._id.toString(), req);
  return {
    tokens,
    user: toUserProfile({ ...user.toObject(), personalAccountId }),
  };
}

export async function refresh(refreshToken: string, req?: Request): Promise<TokenPair> {
  const payload = (() => {
    try {
      return verifyRefreshToken(refreshToken);
    } catch {
      unauthorized("Refresh token invalido ou expirado", "REFRESH_TOKEN_INVALID");
    }
  })();

  if (payload.type !== "refresh") {
    unauthorized("Refresh token invalido", "REFRESH_TOKEN_INVALID");
  }

  const tokenDoc = await RefreshTokenModel.findOne({
    userId: payload.sub,
    jti: payload.jti,
  });

  if (!tokenDoc || tokenDoc.revokedAt || tokenDoc.expiresAt.getTime() <= Date.now()) {
    unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
  }

  if (tokenDoc.tokenHash !== sha256(refreshToken)) {
    unauthorized("Refresh token invalido", "REFRESH_TOKEN_INVALID");
  }

  const nextJti = newId();
  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedByJti = nextJti;
  await tokenDoc.save();

  const accessToken = signAccessToken(payload.sub);
  const nextRefreshToken = signRefreshToken(payload.sub, nextJti);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId: payload.sub,
    jti: nextJti,
    tokenHash: sha256(nextRefreshToken),
    expiresAt,
    deviceInfo: req?.get("user-agent") ?? null,
  });

  return {
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== "refresh") {
      return;
    }

    await RefreshTokenModel.updateOne(
      {
        userId: payload.sub,
        jti: payload.jti,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      },
    );
  } catch {
    // Best effort logout.
  }
}

export async function me(userId: string): Promise<UserProfile> {
  const user = await UserModel.findById(userId);
  if (!user) {
    notFound("Utilizador nao encontrado", "USER_NOT_FOUND");
  }

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function completeTutorial(userId: string): Promise<UserProfile> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { tutorialSeenAt: new Date() } },
    { new: true },
  );
  if (!user) {
    notFound("Utilizador nao encontrado", "USER_NOT_FOUND");
  }

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}
