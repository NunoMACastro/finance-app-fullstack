import { randomBytes } from "node:crypto";
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

async function getActiveMembership(userId: string, accountId: string) {
  return AccountMembershipModel.findOne({
    accountId,
    userId,
    status: "active",
  });
}

async function getAccountOrThrow(accountId: string) {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    notFound("Conta nao encontrada", "ACCOUNT_NOT_FOUND");
  }
  return account;
}

export async function ensurePersonalAccountForUser(userId: string, nameHint?: string): Promise<string> {
  const user = await UserModel.findById(userId);
  if (!user) {
    notFound("Utilizador nao encontrado", "USER_NOT_FOUND");
  }

  const accountName = nameHint ? `${nameHint} (Pessoal)` : "Conta Pessoal";

  // Atomic upsert guarded by unique partial index: one personal account per user.
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
        },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      return AccountModel.findOne({
        createdByUserId: userId,
        type: "personal",
      });
    }
  })();

  if (!personalAccount) {
    notFound("Conta pessoal nao encontrada", "PERSONAL_ACCOUNT_NOT_FOUND");
  }

  await UserModel.updateOne(
    { _id: userId, personalAccountId: { $ne: personalAccount._id } },
    { $set: { personalAccountId: personalAccount._id } },
  );

  await AccountMembershipModel.findOneAndUpdate(
    { accountId: personalAccount._id, userId },
    {
      $set: {
        role: "owner",
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

  return personalAccount._id.toString();
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

  const accountIds = memberships.map((membership) => membership.accountId);
  const accounts = await AccountModel.find({ _id: { $in: accountIds } }).lean();
  const accountsById = new Map(accounts.map((account) => [account._id.toString(), account]));

  const result: AccountSummaryDto[] = [];
  for (const membership of memberships) {
    const account = accountsById.get(membership.accountId.toString());
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

  await ensurePersonalAccountForUser(userId);

  const account = await AccountModel.create({
    name: cleanName,
    type: "shared",
    createdByUserId: userId,
  });

  await AccountMembershipModel.create({
    accountId: account._id,
    userId,
    role: "owner",
    status: "active",
  });

  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    role: "owner",
    isPersonalDefault: false,
  };
}

export async function assertAccountAccess(
  userId: string,
  accountId: string,
): Promise<{ accountId: string; role: AccountRole }> {
  const membership = await getActiveMembership(userId, accountId);
  if (!membership) {
    forbidden("Sem acesso a esta conta", "ACCOUNT_ACCESS_DENIED");
  }

  return {
    accountId,
    role: membership.role,
  };
}

export async function assertOwnerAccess(userId: string, accountId: string): Promise<void> {
  const access = await assertAccountAccess(userId, accountId);
  if (access.role !== "owner") {
    forbidden("Apenas owners podem gerir esta conta", "ACCOUNT_OWNER_REQUIRED");
  }
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

  const membership = await AccountMembershipModel.findOne({
    accountId: account._id,
    userId,
  });

  let role: AccountRole = "viewer";

  if (!membership) {
    await AccountMembershipModel.create({
      accountId: account._id,
      userId,
      role,
      status: "active",
    });
  } else {
    if (membership.status === "inactive") {
      membership.status = "active";
      membership.leftAt = null;
      await membership.save();
    }
    role = membership.role;
  }

  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    role,
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
  await assertOwnerAccess(ownerUserId, accountId);

  const account = await getAccountOrThrow(accountId);
  if (account.type !== "shared") {
    unprocessable("A conta pessoal nao permite gerir roles", "PERSONAL_ACCOUNT_ROLE_FORBIDDEN");
  }

  const membership = await AccountMembershipModel.findOne({
    accountId,
    userId: memberUserId,
    status: "active",
  });

  if (!membership) {
    notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
  }

  if (membership.role === "owner" && role !== "owner") {
    const ownerCount = await AccountMembershipModel.countDocuments({
      accountId,
      status: "active",
      role: "owner",
    });
    if (ownerCount <= 1) {
      unprocessable("A conta precisa de pelo menos um owner", "LAST_OWNER_PROTECTION");
    }
  }

  membership.role = role;
  await membership.save();

  const user = await UserModel.findById(memberUserId).lean();
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
}

export async function removeMember(
  ownerUserId: string,
  accountId: string,
  memberUserId: string,
): Promise<void> {
  await assertOwnerAccess(ownerUserId, accountId);

  const account = await getAccountOrThrow(accountId);
  if (account.type !== "shared") {
    unprocessable("A conta pessoal nao permite remover membros", "PERSONAL_ACCOUNT_MEMBER_FORBIDDEN");
  }

  const membership = await AccountMembershipModel.findOne({
    accountId,
    userId: memberUserId,
    status: "active",
  });

  if (!membership) {
    notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
  }

  if (membership.role === "owner") {
    const ownerCount = await AccountMembershipModel.countDocuments({
      accountId,
      status: "active",
      role: "owner",
    });
    if (ownerCount <= 1) {
      unprocessable("A conta precisa de pelo menos um owner", "LAST_OWNER_PROTECTION");
    }
  }

  membership.status = "inactive";
  membership.leftAt = new Date();
  await membership.save();
}

export async function leaveAccount(userId: string, accountId: string): Promise<void> {
  const account = await getAccountOrThrow(accountId);

  if (account.type === "personal") {
    unprocessable("Nao e possivel sair da conta pessoal", "PERSONAL_ACCOUNT_CANNOT_LEAVE");
  }

  const membership = await AccountMembershipModel.findOne({
    accountId,
    userId,
    status: "active",
  });

  if (!membership) {
    notFound("Membro nao encontrado", "ACCOUNT_MEMBER_NOT_FOUND");
  }

  if (membership.role === "owner") {
    const ownerCount = await AccountMembershipModel.countDocuments({
      accountId,
      status: "active",
      role: "owner",
    });

    if (ownerCount <= 1) {
      unprocessable(
        "Nao pode sair da conta sendo o ultimo owner. Promova outro owner primeiro.",
        "LAST_OWNER_CANNOT_LEAVE",
      );
    }
  }

  membership.status = "inactive";
  membership.leftAt = new Date();
  await membership.save();
}
