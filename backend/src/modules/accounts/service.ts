import { randomBytes } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { notFound, forbidden, unprocessable } from "../../lib/api-error.js";
import { sha256 } from "../../lib/hash.js";
import { AccountInviteCodeModel } from "../../models/account-invite-code.model.js";
import { AccountMembershipModel } from "../../models/account-membership.model.js";
import { AccountModel } from "../../models/account.model.js";
import { UserModel } from "../../models/user.model.js";

export type AccountRole = "owner" | "editor" | "viewer";

const INVITE_TTL_DAYS = 7;

interface AccountSummaryDto {
  id: string;
  name: string;
  type: "personal" | "shared";
  role: AccountRole;
  isPersonalDefault: boolean;
}

interface InviteCodeDto {
  code: string;
  expiresAt: string;
}

interface MemberDto {
  userId: string;
  name: string;
  email: string;
  role: AccountRole;
  status: "active" | "inactive";
}

function makeInviteCode(): string {
  const raw = randomBytes(6)
    .toString("base64url")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return raw.slice(0, 8).padEnd(8, "X");
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function roleWeight(role: AccountRole): number {
  if (role === "owner") return 3;
  if (role === "editor") return 2;
  return 1;
}

async function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function getActiveMembership(userId: string, accountId: string, session?: ClientSession) {
  const query = AccountMembershipModel.findOne({
    accountId,
    userId,
    status: "active",
  });
  if (session) query.session(session);
  return query;
}

async function getAccountOrThrow(accountId: string, session?: ClientSession) {
  const query = AccountModel.findById(accountId);
  if (session) query.session(session);
  const account = await query;
  if (!account) {
    notFound("Conta nao encontrada", "ACCOUNT_NOT_FOUND");
  }
  return account;
}

async function ensurePersonalAccountForUserInSession(
  userId: string,
  nameHint: string | undefined,
  session: ClientSession,
): Promise<string> {
  const user = await UserModel.findById(userId).session(session);
  if (!user) {
    notFound("Utilizador nao encontrado", "USER_NOT_FOUND");
  }

  const accountName = nameHint ? `${nameHint} (Pessoal)` : "Conta Pessoal";

  const personalAccount = await (async () => {
    try {
      return await AccountModel.findOneAndUpdate(
        {
          createdByUserId: userId,
          type: "personal",
        },
        {
          $setOnInsert: {
            name: accountName,
            createdByUserId: userId,
            type: "personal",
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session,
        },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      return AccountModel.findOne({
        createdByUserId: userId,
        type: "personal",
      }).session(session);
    }
  })();

  if (!personalAccount) {
    notFound("Conta pessoal nao encontrada", "PERSONAL_ACCOUNT_NOT_FOUND");
  }

  if (!user.personalAccountId || user.personalAccountId.toString() !== personalAccount._id.toString()) {
    user.personalAccountId = personalAccount._id;
    await user.save({ session });
  }

  const membership = await AccountMembershipModel.findOne({
    accountId: personalAccount._id,
    userId,
  }).session(session);

  if (!membership) {
    await AccountMembershipModel.create(
      [
        {
          accountId: personalAccount._id,
          userId,
          role: "owner",
          status: "active",
          leftAt: null,
        },
      ],
      { session },
    );
  } else {
    let changed = false;
    if (membership.role !== "owner") {
      membership.role = "owner";
      changed = true;
    }
    if (membership.status !== "active") {
      membership.status = "active";
      changed = true;
    }
    if (membership.leftAt !== null) {
      membership.leftAt = null;
      changed = true;
    }
    if (changed) {
      await membership.save({ session });
    }
  }

  return personalAccount._id.toString();
}

export async function ensurePersonalAccountForUser(userId: string, nameHint?: string): Promise<string> {
  return runInTransaction((session) => ensurePersonalAccountForUserInSession(userId, nameHint, session));
}

export async function listUserAccounts(userId: string): Promise<AccountSummaryDto[]> {
  const personalAccountId = await ensurePersonalAccountForUser(userId);

  const memberships = await AccountMembershipModel.find({
    userId,
    status: "active",
  }).lean();

  if (memberships.length === 0) {
    return [];
  }

  const bestMembershipByAccount = new Map<string, (typeof memberships)[number]>();
  for (const membership of memberships) {
    const accountId = membership.accountId.toString();
    const existing = bestMembershipByAccount.get(accountId);
    if (!existing || roleWeight(membership.role) > roleWeight(existing.role)) {
      bestMembershipByAccount.set(accountId, membership);
    }
  }

  const accountIds = Array.from(bestMembershipByAccount.keys());
  const accounts = await AccountModel.find({ _id: { $in: accountIds } }).lean();
  const accountsById = new Map(accounts.map((account) => [account._id.toString(), account]));

  const result: AccountSummaryDto[] = [];
  for (const [accountId, membership] of bestMembershipByAccount.entries()) {
    const account = accountsById.get(accountId);
    if (!account) {
      continue;
    }

    result.push({
      id: account._id.toString(),
      name: account.name,
      type: account.type,
      role: membership.role,
      isPersonalDefault: account._id.toString() === personalAccountId,
    });
  }

  result.sort((a, b) => {
    if (a.isPersonalDefault) return -1;
    if (b.isPersonalDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export async function createSharedAccount(userId: string, name: string): Promise<AccountSummaryDto> {
  const cleanName = name.trim();
  if (!cleanName) {
    unprocessable("Nome da conta e obrigatorio", "ACCOUNT_NAME_REQUIRED");
  }

  return runInTransaction(async (session) => {
    await ensurePersonalAccountForUserInSession(userId, undefined, session);

    const createdAccounts = await AccountModel.create(
      [
        {
          name: cleanName,
          type: "shared",
          createdByUserId: userId,
        },
      ],
      { session },
    );
    const account = createdAccounts[0];
    if (!account) {
      notFound("Conta nao encontrada", "ACCOUNT_NOT_FOUND");
    }

    await AccountMembershipModel.create(
      [
        {
          accountId: account._id,
          userId,
          role: "owner",
          status: "active",
        },
      ],
      { session },
    );

    return {
      id: account._id.toString(),
      name: account.name,
      type: account.type,
      role: "owner",
      isPersonalDefault: false,
    };
  });
}

async function assertAccountAccessInternal(
  userId: string,
  accountId: string,
  session?: ClientSession,
): Promise<{ accountId: string; role: AccountRole }> {
  const membership = await getActiveMembership(userId, accountId, session);
  if (!membership) {
    forbidden("Sem acesso a esta conta", "ACCOUNT_ACCESS_DENIED");
  }

  return {
    accountId,
    role: membership.role,
  };
}

export async function assertAccountAccess(
  userId: string,
  accountId: string,
): Promise<{ accountId: string; role: AccountRole }> {
  return assertAccountAccessInternal(userId, accountId);
}

async function assertOwnerAccessInternal(userId: string, accountId: string, session?: ClientSession): Promise<void> {
  const access = await assertAccountAccessInternal(userId, accountId, session);
  if (access.role !== "owner") {
    forbidden("Apenas owners podem gerir esta conta", "ACCOUNT_OWNER_REQUIRED");
  }
}

export async function assertOwnerAccess(userId: string, accountId: string): Promise<void> {
  await assertOwnerAccessInternal(userId, accountId);
}

export async function generateInviteCode(userId: string, accountId: string): Promise<InviteCodeDto> {
  await assertOwnerAccess(userId, accountId);

  const account = await getAccountOrThrow(accountId);
  if (account.type !== "shared") {
    unprocessable("Convites so sao permitidos para contas partilhadas", "INVITE_ONLY_SHARED_ACCOUNT");
  }

  const now = new Date();
  await AccountInviteCodeModel.updateMany(
    {
      accountId,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { revokedAt: now },
    },
  );

  const code = makeInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await AccountInviteCodeModel.create({
    accountId,
    codeHash: sha256(code),
    expiresAt,
    createdByUserId: userId,
    revokedAt: null,
  });

  return {
    code,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function joinByInviteCode(userId: string, code: string): Promise<AccountSummaryDto> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    unprocessable("Codigo de convite invalido", "INVITE_CODE_INVALID");
  }

  const personalAccountId = await ensurePersonalAccountForUser(userId);

  const invite = await AccountInviteCodeModel.findOne({
    codeHash: sha256(cleanCode),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!invite) {
    unprocessable("Codigo de convite invalido ou expirado", "INVITE_CODE_INVALID_OR_EXPIRED");
  }

  const account = await getAccountOrThrow(invite.accountId.toString());
  if (account.type !== "shared") {
    unprocessable("Codigo nao corresponde a conta partilhada", "INVITE_ONLY_SHARED_ACCOUNT");
  }

  const membership = await AccountMembershipModel.findOneAndUpdate(
    {
      accountId: account._id,
      userId,
    },
    {
      $setOnInsert: {
        role: "viewer",
      },
      $set: {
        status: "active",
        leftAt: null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  if (!membership) {
    notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
  }

  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    role: membership.role,
    isPersonalDefault: account._id.toString() === personalAccountId,
  };
}

export async function listMembers(userId: string, accountId: string): Promise<MemberDto[]> {
  await assertOwnerAccess(userId, accountId);

  const memberships = await AccountMembershipModel.find({
    accountId,
    status: "active",
  }).lean();

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.userId);
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select({ _id: 1, email: 1, profile: 1 })
    .lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  const result: MemberDto[] = [];
  for (const membership of memberships) {
    const memberUser = usersById.get(membership.userId.toString());
    if (!memberUser) {
      continue;
    }

    result.push({
      userId: memberUser._id.toString(),
      name: memberUser.profile?.name ?? memberUser.email,
      email: memberUser.email,
      role: membership.role,
      status: membership.status,
    });
  }

  return result;
}

export async function updateMemberRole(
  ownerUserId: string,
  accountId: string,
  memberUserId: string,
  role: AccountRole,
): Promise<MemberDto> {
  return runInTransaction(async (session) => {
    await assertOwnerAccessInternal(ownerUserId, accountId, session);

    const account = await getAccountOrThrow(accountId, session);
    if (account.type !== "shared") {
      unprocessable("A conta pessoal nao permite gerir roles", "PERSONAL_ACCOUNT_ROLE_FORBIDDEN");
    }

    const membership = await AccountMembershipModel.findOne({
      accountId,
      userId: memberUserId,
      status: "active",
    }).session(session);

    if (!membership) {
      notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
    }

    if (membership.role === "owner" && role !== "owner") {
      const ownerCount = await AccountMembershipModel.countDocuments({
        accountId,
        status: "active",
        role: "owner",
      }).session(session);
      if (ownerCount <= 1) {
        unprocessable("A conta precisa de pelo menos um owner", "LAST_OWNER_PROTECTION");
      }
    }

    membership.role = role;
    await membership.save({ session });

    const user = await UserModel.findById(memberUserId).session(session).lean();
    if (!user) {
      notFound("Utilizador nao encontrado", "USER_NOT_FOUND");
    }

    return {
      userId: String(user._id),
      name: user.profile?.name ?? user.email,
      email: user.email,
      role,
      status: "active",
    };
  });
}

export async function removeMember(
  ownerUserId: string,
  accountId: string,
  memberUserId: string,
): Promise<void> {
  await runInTransaction(async (session) => {
    await assertOwnerAccessInternal(ownerUserId, accountId, session);

    const account = await getAccountOrThrow(accountId, session);
    if (account.type !== "shared") {
      unprocessable("A conta pessoal nao permite remover membros", "PERSONAL_ACCOUNT_MEMBER_FORBIDDEN");
    }

    const membership = await AccountMembershipModel.findOne({
      accountId,
      userId: memberUserId,
      status: "active",
    }).session(session);

    if (!membership) {
      notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
    }

    if (membership.role === "owner") {
      const ownerCount = await AccountMembershipModel.countDocuments({
        accountId,
        status: "active",
        role: "owner",
      }).session(session);
      if (ownerCount <= 1) {
        unprocessable("A conta precisa de pelo menos um owner", "LAST_OWNER_PROTECTION");
      }
    }

    membership.status = "inactive";
    membership.leftAt = new Date();
    await membership.save({ session });
  });
}

export async function leaveAccount(userId: string, accountId: string): Promise<void> {
  await runInTransaction(async (session) => {
    const account = await getAccountOrThrow(accountId, session);

    if (account.type === "personal") {
      unprocessable("Nao e possivel sair da conta pessoal", "PERSONAL_ACCOUNT_CANNOT_LEAVE");
    }

    const membership = await AccountMembershipModel.findOne({
      accountId,
      userId,
      status: "active",
    }).session(session);

    if (!membership) {
      notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
    }

    if (membership.role === "owner") {
      const ownerCount = await AccountMembershipModel.countDocuments({
        accountId,
        status: "active",
        role: "owner",
      }).session(session);

      if (ownerCount <= 1) {
        unprocessable(
          "Nao pode sair da conta sendo o ultimo owner. Promova outro owner primeiro.",
          "LAST_OWNER_CANNOT_LEAVE",
        );
      }
    }

    membership.status = "inactive";
    membership.leftAt = new Date();
    await membership.save({ session });
  });
}
