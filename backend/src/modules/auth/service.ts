import { randomBytes } from "node:crypto";
import type { Request } from "express";
import mongoose, { Types } from "mongoose";
import { env } from "../../config/env.js";
import { conflict, notFound, unauthorized, unprocessable } from "../../lib/api-error.js";
import { newId, sha256 } from "../../lib/hash.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { AccountMembershipModel } from "../../models/account-membership.model.js";
import { AccountModel } from "../../models/account.model.js";
import { BudgetModel } from "../../models/budget.model.js";
import { IncomeCategoryModel } from "../../models/income-category.model.js";
import { RecurringRuleModel } from "../../models/recurring-rule.model.js";
import { RefreshTokenModel } from "../../models/refresh-token.model.js";
import { StatsSnapshotModel } from "../../models/stats-snapshot.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { UserModel } from "../../models/user.model.js";
import { ensurePersonalAccountForUser } from "../accounts/service.js";
import { ensureDefaultIncomeCategoryForAccount } from "../income-categories/service.js";

export type ThemePalette = "brisa" | "calma" | "aurora" | "terra" | "mare" | "amber" | "ciano";

interface UserPreferences {
  themePalette: ThemePalette;
  hideAmountsByDefault: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  currency: string;
  preferences: UserPreferences;
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

interface SessionDto {
  jti: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface MembershipExportItem {
  accountId: string;
  accountName: string;
  accountType: "personal" | "shared";
  role: "owner" | "editor" | "viewer";
  status: "active" | "inactive";
}

interface ExportUserDataDto {
  exportedAt: string;
  user: UserProfile;
  personalAccount: {
    accountId: string;
    budgets: unknown[];
    transactions: unknown[];
    recurringRules: unknown[];
    incomeCategories: unknown[];
    statsSnapshots: unknown[];
  };
  sharedMemberships: MembershipExportItem[];
}

function normalizeThemePalette(value?: string | null): ThemePalette {
  if (
    value === "brisa" ||
    value === "calma" ||
    value === "aurora" ||
    value === "terra" ||
    value === "mare" ||
    value === "amber" ||
    value === "ciano"
  ) {
    return value;
  }

  // Backward compatibility with previous palette IDs.
  if (value === "ocean") return "brisa";
  if (value === "forest") return "terra";
  if (value === "sunset") return "aurora";
  if (value === "graphite") return "calma";
  if (value === "ambar") return "amber";

  return "ciano";
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertUserActive(user: { status?: string | null }): void {
  if (user.status === "deleted") {
    unauthorized("Conta desativada", "ACCOUNT_DELETED");
  }
}

function toUserProfile(user: {
  _id: Types.ObjectId;
  email: string;
  profile?: { name?: string; currency?: string } | null;
  preferences?: { themePalette?: ThemePalette; hideAmountsByDefault?: boolean } | null;
  status?: "active" | "deleted";
  tutorialSeenAt?: Date | null;
  personalAccountId?: Types.ObjectId | string | null;
}): UserProfile {
  assertUserActive(user);

  const profile = user.profile ?? {};
  const preferences = user.preferences ?? {};
  const personalAccountId =
    typeof user.personalAccountId === "string"
      ? user.personalAccountId
      : user.personalAccountId?.toString() ?? "";

  return {
    id: user._id.toString(),
    email: user.email,
    name: profile.name ?? "",
    currency: profile.currency ?? "EUR",
    preferences: {
      themePalette: normalizeThemePalette(preferences.themePalette),
      hideAmountsByDefault: preferences.hideAmountsByDefault ?? false,
    },
    tutorialSeenAt: user.tutorialSeenAt ? user.tutorialSeenAt.toISOString() : null,
    personalAccountId,
  };
}

async function getUserOrThrow(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    notFound("Utilizador não encontrado", "USER_NOT_FOUND");
  }
  return user;
}

async function getActiveUserOrThrow(userId: string) {
  const user = await getUserOrThrow(userId);
  assertUserActive(user);
  return user;
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

      await ensureDefaultIncomeCategoryForAccount(personalAccountId.toString(), session);

      await UserModel.create(
        [
          {
            _id: userId,
            email,
            passwordHash,
            profile: {
              name: trimmedName,
              currency: "EUR",
            },
            preferences: {
              themePalette: "ciano",
              hideAmountsByDefault: false,
            },
            status: "active",
            deletedAt: null,
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
      },
      preferences: {
        themePalette: "ciano",
        hideAmountsByDefault: false,
      },
      status: "active",
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

  assertUserActive(user);

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
      unauthorized("Refresh token inválido ou expirado", "REFRESH_TOKEN_INVALID");
    }
  })();

  if (payload.type !== "refresh") {
    unauthorized("Refresh token inválido", "REFRESH_TOKEN_INVALID");
  }

  const user = await UserModel.findById(payload.sub).select({ status: 1 }).lean();
  if (!user) {
    unauthorized("Refresh token inválido", "REFRESH_TOKEN_INVALID");
  }
  assertUserActive(user);

  const tokenDoc = await RefreshTokenModel.findOne({
    userId: payload.sub,
    jti: payload.jti,
  });

  if (!tokenDoc || tokenDoc.revokedAt || tokenDoc.expiresAt.getTime() <= Date.now()) {
    unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
  }

  if (tokenDoc.tokenHash !== sha256(refreshToken)) {
    unauthorized("Refresh token inválido", "REFRESH_TOKEN_INVALID");
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
  const user = await getActiveUserOrThrow(userId);

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function completeTutorial(userId: string): Promise<UserProfile> {
  const user = await getActiveUserOrThrow(userId);
  user.tutorialSeenAt = new Date();
  await user.save();

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function resetTutorial(userId: string): Promise<UserProfile> {
  const user = await getActiveUserOrThrow(userId);
  user.tutorialSeenAt = null;
  await user.save();

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function updateProfile(
  userId: string,
  input: {
    name?: string;
    currency?: string;
    preferences?: {
      themePalette?: ThemePalette;
      hideAmountsByDefault?: boolean;
    };
  },
): Promise<UserProfile> {
  const user = await getActiveUserOrThrow(userId);

  const profile = user.profile ?? {
    name: "",
    currency: "EUR",
  };
  user.profile = profile;

  const preferences = user.preferences ?? {
    themePalette: "ciano",
    hideAmountsByDefault: false,
  };
  user.preferences = preferences;
  preferences.themePalette = normalizeThemePalette(preferences.themePalette);

  if (input.name !== undefined) profile.name = input.name.trim();
  if (input.currency !== undefined) profile.currency = input.currency.trim().toUpperCase();

  if (input.preferences?.themePalette !== undefined) {
    preferences.themePalette = normalizeThemePalette(input.preferences.themePalette);
  }
  if (input.preferences?.hideAmountsByDefault !== undefined) {
    preferences.hideAmountsByDefault = input.preferences.hideAmountsByDefault;
  }

  await user.save();

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function updateEmail(
  userId: string,
  input: { currentPassword: string; newEmail: string },
): Promise<UserProfile> {
  const user = await getActiveUserOrThrow(userId);

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) {
    unauthorized("Password atual inválida", "CURRENT_PASSWORD_INVALID");
  }

  const nextEmail = input.newEmail.toLowerCase().trim();
  if (nextEmail !== user.email) {
    const existing = await UserModel.findOne({ email: nextEmail, _id: { $ne: userId } })
      .select({ _id: 1 })
      .lean();
    if (existing) {
      conflict("Email ja registado", "EMAIL_ALREADY_USED");
    }
    user.email = nextEmail;
    await user.save();
  }

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  return toUserProfile({ ...user.toObject(), personalAccountId });
}

export async function updatePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await getActiveUserOrThrow(userId);

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) {
    unauthorized("Password atual inválida", "CURRENT_PASSWORD_INVALID");
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
}

export async function listSessions(userId: string): Promise<SessionDto[]> {
  await getActiveUserOrThrow(userId);

  const sessions = await RefreshTokenModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return sessions.map((session) => ({
    jti: session.jti,
    deviceInfo: session.deviceInfo ?? null,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
  }));
}

export async function revokeSession(userId: string, jti: string): Promise<void> {
  const revokeResult = await RefreshTokenModel.updateOne(
    {
      userId,
      jti,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  );

  if (revokeResult.matchedCount > 0) {
    return;
  }

  // If already revoked, allow deleting it from history to avoid unbounded session lists.
  const deleteResult = await RefreshTokenModel.deleteOne({
    userId,
    jti,
    revokedAt: { $ne: null },
  });

  if (deleteResult.deletedCount > 0) {
    return;
  }

  notFound("Sessão não encontrada", "SESSION_NOT_FOUND");
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshTokenModel.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}

export async function removeRevokedSessions(userId: string): Promise<void> {
  await getActiveUserOrThrow(userId);

  await RefreshTokenModel.deleteMany({
    userId,
    revokedAt: { $ne: null },
  });
}

export async function exportUserData(userId: string): Promise<ExportUserDataDto> {
  const user = await getActiveUserOrThrow(userId);

  const personalAccountId = await ensurePersonalAccountForUser(
    userId,
    user.profile?.name ?? "",
  );

  const [budgets, transactions, recurringRules, incomeCategories, statsSnapshots] = await Promise.all([
    BudgetModel.find({ accountId: personalAccountId }).lean(),
    TransactionModel.find({ accountId: personalAccountId }).lean(),
    RecurringRuleModel.find({ accountId: personalAccountId }).lean(),
    IncomeCategoryModel.find({ accountId: personalAccountId }).lean(),
    StatsSnapshotModel.find({ accountId: personalAccountId }).lean(),
  ]);

  const sharedMembershipDocs = await AccountMembershipModel.find({
    userId,
    accountId: { $ne: personalAccountId },
  }).lean();
  const sharedAccountIds = sharedMembershipDocs.map((membership) => membership.accountId);
  const sharedAccounts = await AccountModel.find({ _id: { $in: sharedAccountIds } }).lean();
  const sharedById = new Map(sharedAccounts.map((account) => [account._id.toString(), account]));

  const sharedMemberships: MembershipExportItem[] = sharedMembershipDocs
    .map((membership) => {
      const account = sharedById.get(membership.accountId.toString());
      if (!account) return null;

      return {
        accountId: account._id.toString(),
        accountName: account.name,
        accountType: account.type,
        role: membership.role,
        status: membership.status,
      };
    })
    .filter((item): item is MembershipExportItem => item !== null);

  return {
    exportedAt: new Date().toISOString(),
    user: toUserProfile({ ...user.toObject(), personalAccountId }),
    personalAccount: {
      accountId: personalAccountId,
      budgets: toPlain(budgets),
      transactions: toPlain(transactions),
      recurringRules: toPlain(recurringRules),
      incomeCategories: toPlain(incomeCategories),
      statsSnapshots: toPlain(statsSnapshots),
    },
    sharedMemberships,
  };
}

export async function deleteMe(userId: string, currentPassword: string): Promise<void> {
  const user = await getActiveUserOrThrow(userId);

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    unauthorized("Password atual inválida", "CURRENT_PASSWORD_INVALID");
  }

  const memberships = await AccountMembershipModel.find({ userId, status: "active" }).lean();
  const accountIds = memberships.map((item) => item.accountId);
  const accounts = await AccountModel.find({ _id: { $in: accountIds } }).lean();
  const accountById = new Map(accounts.map((account) => [account._id.toString(), account]));

  const sharedOwnerMemberships = memberships.filter((membership) => {
    const account = accountById.get(membership.accountId.toString());
    return account?.type === "shared" && membership.role === "owner";
  });

  for (const membership of sharedOwnerMemberships) {
    const ownerCount = await AccountMembershipModel.countDocuments({
      accountId: membership.accountId,
      status: "active",
      role: "owner",
    });

    if (ownerCount <= 1) {
      unprocessable(
        "Não pode apagar a conta sendo o último owner de uma conta partilhada",
        "LAST_OWNER_CANNOT_DELETE_ACCOUNT",
      );
    }
  }

  const sharedAccountIds = memberships
    .filter((membership) => accountById.get(membership.accountId.toString())?.type === "shared")
    .map((membership) => membership.accountId);

  const now = new Date();
  const deletedEmail = `deleted_${user._id.toString()}@deleted.local`;
  const disabledPasswordHash = await hashPassword(randomBytes(24).toString("hex"));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (sharedAccountIds.length > 0) {
        await AccountMembershipModel.updateMany(
          {
            userId,
            accountId: { $in: sharedAccountIds },
            status: "active",
          },
          {
            $set: {
              status: "inactive",
              leftAt: now,
            },
          },
          { session },
        );
      }

      await RefreshTokenModel.updateMany(
        {
          userId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: now,
          },
        },
        { session },
      );

      user.email = deletedEmail;
      user.passwordHash = disabledPasswordHash;
      const profile = user.profile ?? {
        name: "",
        currency: "EUR",
      };
      user.profile = profile;
      profile.name = "Conta removida";
      user.status = "deleted";
      user.deletedAt = now;
      user.tutorialSeenAt = null;

      await user.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
