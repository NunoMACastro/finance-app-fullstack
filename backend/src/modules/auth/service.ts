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
import { AuthSessionModel } from "../../models/auth-session.model.js";
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

interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

interface IssuedAuthResponse extends AuthResponse {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface SessionDto {
  sid: string;
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

const ALLOWED_CURRENCIES = new Set(["EUR", "USD", "GBP", "BRL", "CHF"]);

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

function assertCurrencyAllowed(currency?: string | null): string {
  const normalized = currency?.trim().toUpperCase() ?? "EUR";
  if (!ALLOWED_CURRENCIES.has(normalized)) {
    unprocessable("Moeda não suportada", "CURRENCY_NOT_SUPPORTED");
  }
  return normalized;
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

function nextRefreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function revokeSessionFamily(
  sid: string,
  status: "revoked" | "compromised",
  when = new Date(),
): Promise<void> {
  await Promise.all([
    AuthSessionModel.updateOne(
      { sid },
      {
        $set: {
          status,
          revokedAt: when,
          compromisedAt: status === "compromised" ? when : null,
        },
      },
    ),
    RefreshTokenModel.updateMany(
      { sid, revokedAt: null },
      {
        $set: { revokedAt: when },
      },
    ),
  ]);
}

async function revokeAllUserSessions(userId: string, when = new Date()): Promise<void> {
  await Promise.all([
    AuthSessionModel.updateMany(
      { userId, status: "active" },
      {
        $set: {
          status: "revoked",
          revokedAt: when,
        },
      },
    ),
    RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      {
        $set: { revokedAt: when },
      },
    ),
  ]);
}

async function createSessionTokenPair(
  userId: string,
  req?: Request,
  existingSid?: string,
): Promise<{ sid: string; accessToken: string; refreshToken: string; expiresAt: Date }> {
  const sid = existingSid ?? newId();
  const jti = newId();
  const expiresAt = nextRefreshExpiry();
  const accessToken = signAccessToken(userId, sid);
  const refreshToken = signRefreshToken(userId, sid, jti);
  const deviceInfo = req?.get("user-agent") ?? null;
  const now = new Date();

  await AuthSessionModel.findOneAndUpdate(
    { sid },
    {
      $set: {
        userId,
        status: "active",
        revokedAt: null,
        compromisedAt: null,
        currentRefreshJti: jti,
        expiresAt,
        lastSeenAt: now,
        deviceInfo,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await RefreshTokenModel.create({
    userId,
    sid,
    jti,
    tokenHash: sha256(refreshToken),
    expiresAt,
    deviceInfo,
  });

  return { sid, accessToken, refreshToken, expiresAt };
}

function ensureStrongPassword(password: string): void {
  if (password.length < 10) {
    unprocessable("Password demasiado curta", "PASSWORD_TOO_WEAK");
  }
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}, req?: Request): Promise<IssuedAuthResponse> {
  const email = input.email.toLowerCase().trim();
  const trimmedName = input.name.trim();
  ensureStrongPassword(input.password);
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
            activeOwnerCount: 1,
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

  const tokens = await createSessionTokenPair(userId.toString(), req);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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
}, req?: Request): Promise<IssuedAuthResponse> {
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

  const tokens = await createSessionTokenPair(user._id.toString(), req);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toUserProfile({ ...user.toObject(), personalAccountId }),
  };
}

export async function refresh(refreshToken: string | undefined, req?: Request): Promise<RefreshResponse> {
  if (!refreshToken?.trim()) {
    unauthorized("Refresh token em falta", "REFRESH_TOKEN_MISSING");
  }

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

  const tokenHash = sha256(refreshToken);
  const tokenDoc = await RefreshTokenModel.findOne({
    userId: payload.sub,
    sid: payload.sid,
    jti: payload.jti,
  }).select({ tokenHash: 1, revokedAt: 1, expiresAt: 1 });

  if (!tokenDoc) {
    unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
  }

  if (tokenDoc.tokenHash !== tokenHash) {
    unauthorized("Refresh token inválido", "REFRESH_TOKEN_INVALID");
  }

  if (tokenDoc.expiresAt.getTime() <= Date.now()) {
    unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
  }

  const rotationSession = await mongoose.startSession();
  try {
    let accessToken = "";
    let nextRefreshToken = "";
    const nextJti = newId();
    const now = new Date();
    const expiresAt = nextRefreshExpiry();
    const deviceInfo = req?.get("user-agent") ?? null;

    await rotationSession.withTransaction(async () => {
      // CAS gate: only the current refresh jti may advance this session.
      const sessionDoc = await AuthSessionModel.findOneAndUpdate(
        {
          sid: payload.sid,
          userId: payload.sub,
          status: "active",
          expiresAt: { $gt: now },
          currentRefreshJti: payload.jti,
        },
        {
          $set: {
            currentRefreshJti: nextJti,
            expiresAt,
            lastSeenAt: now,
            deviceInfo,
          },
        },
        {
          new: true,
          session: rotationSession,
        },
      );

      if (!sessionDoc) {
        unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
      }

      const revokedToken = await RefreshTokenModel.findOneAndUpdate(
        {
          _id: tokenDoc._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: now,
            replacedByJti: nextJti,
          },
        },
        {
          new: true,
          session: rotationSession,
        },
      );

      if (!revokedToken) {
        unauthorized("Refresh token revogado ou expirado", "REFRESH_TOKEN_REVOKED");
      }

      nextRefreshToken = signRefreshToken(payload.sub, payload.sid, nextJti);
      accessToken = signAccessToken(payload.sub, payload.sid);

      await RefreshTokenModel.create(
        [
          {
            userId: payload.sub,
            sid: payload.sid,
            jti: nextJti,
            tokenHash: sha256(nextRefreshToken),
            expiresAt,
            deviceInfo,
          },
        ],
        { session: rotationSession },
      );
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  } finally {
    await rotationSession.endSession();
  }
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== "refresh") {
      return;
    }

    await revokeSessionFamily(payload.sid, "revoked");
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
  if (input.currency !== undefined) profile.currency = assertCurrencyAllowed(input.currency);

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

  ensureStrongPassword(input.newPassword);
  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
  await revokeAllUserSessions(userId);
}

export async function listSessions(userId: string): Promise<SessionDto[]> {
  await getActiveUserOrThrow(userId);

  const sessions = await AuthSessionModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return sessions.map((session) => ({
    sid: session.sid,
    jti: session.sid,
    deviceInfo: session.deviceInfo ?? null,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
  }));
}

export async function revokeSession(userId: string, sid: string): Promise<void> {
  const session = await AuthSessionModel.findOne({ userId, sid });
  if (!session) {
    notFound("Sessão não encontrada", "SESSION_NOT_FOUND");
  }

  if (session.status !== "active") {
    await AuthSessionModel.deleteOne({ _id: session._id });
    await RefreshTokenModel.deleteMany({ sid, userId });
    return;
  }

  await revokeSessionFamily(sid, "revoked");
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await revokeAllUserSessions(userId);
}

export async function removeRevokedSessions(userId: string): Promise<void> {
  await getActiveUserOrThrow(userId);

  const revokedSessions = await AuthSessionModel.find({
    userId,
    status: { $ne: "active" },
  })
    .select({ sid: 1 })
    .lean();

  if (revokedSessions.length === 0) return;

  const sids = revokedSessions.map((session) => session.sid);
  await Promise.all([
    AuthSessionModel.deleteMany({ userId, sid: { $in: sids } }),
    RefreshTokenModel.deleteMany({ userId, sid: { $in: sids } }),
  ]);
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

  const now = new Date();
  const deletedEmail = `deleted_${user._id.toString()}@deleted.local`;
  const disabledPasswordHash = await hashPassword(randomBytes(24).toString("hex"));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const activeMemberships = await AccountMembershipModel.find({ userId, status: "active" }).session(session);
      const accountIds = activeMemberships.map((item) => item.accountId);
      const accounts = await AccountModel.find({ _id: { $in: accountIds } }).session(session);
      const accountById = new Map(accounts.map((account) => [account._id.toString(), account]));

      const sharedAccountIds = activeMemberships
        .filter((membership) => accountById.get(membership.accountId.toString())?.type === "shared")
        .map((membership) => membership.accountId);
      const ownerSharedAccountIds = Array.from(
        new Set(
          activeMemberships
            .filter((membership) => {
              const account = accountById.get(membership.accountId.toString());
              return account?.type === "shared" && membership.role === "owner";
            })
            .map((membership) => membership.accountId.toString()),
        ),
      );

      for (const accountId of ownerSharedAccountIds) {
        const result = await AccountModel.updateOne(
          {
            _id: accountId,
            activeOwnerCount: { $gt: 1 },
          },
          {
            $inc: { activeOwnerCount: -1 },
          },
          { session },
        );

        if (result.modifiedCount === 0) {
          unprocessable(
            "Não pode apagar a conta sendo o último owner de uma conta partilhada",
            "LAST_OWNER_CANNOT_DELETE_ACCOUNT",
          );
        }
      }

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

      await Promise.all([
        AuthSessionModel.updateMany(
          {
            userId,
            status: "active",
          },
          {
            $set: {
              status: "revoked",
              revokedAt: now,
            },
          },
          { session },
        ),
        RefreshTokenModel.updateMany(
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
        ),
      ]);

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
