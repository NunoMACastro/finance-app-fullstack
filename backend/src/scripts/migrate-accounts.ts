import { connectDb, disconnectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { AccountMembershipModel } from "../models/account-membership.model.js";
import { AccountModel } from "../models/account.model.js";
import { BudgetModel } from "../models/budget.model.js";
import { RecurringRuleModel } from "../models/recurring-rule.model.js";
import { StatsSnapshotModel } from "../models/stats-snapshot.model.js";
import { TransactionModel } from "../models/transaction.model.js";
import { UserModel } from "../models/user.model.js";
import { ensurePersonalAccountForUser } from "../modules/accounts/service.js";

async function ensurePersonalAccounts(): Promise<Map<string, string>> {
  const users = await UserModel.find({}).lean();
  const map = new Map<string, string>();

  for (const user of users) {
    const userId = user._id.toString();
    const personalAccountId = await ensurePersonalAccountForUser(userId, user.profile?.name ?? user.email);
    map.set(userId, personalAccountId);
  }

  return map;
}

async function backfillModelAccountId(
  label: string,
  updateForUser: (userId: string, accountId: string) => Promise<number>,
  userAccountMap: Map<string, string>,
): Promise<number> {
  let modified = 0;

  for (const [userId, accountId] of userAccountMap.entries()) {
    modified += await updateForUser(userId, accountId);
  }

  logger.info({ label, modified }, "Backfill completed");
  return modified;
}

async function run(): Promise<void> {
  await connectDb();

  logger.info("Starting account migration");

  const userAccountMap = await ensurePersonalAccounts();

  await backfillModelAccountId(
    "budgets",
    async (userId, accountId) => {
      const result = await BudgetModel.updateMany(
        {
          userId,
          $or: [{ accountId: { $exists: false } }, { accountId: null }],
        },
        {
          $set: { accountId },
        },
      );
      return result.modifiedCount;
    },
    userAccountMap,
  );

  await backfillModelAccountId(
    "transactions",
    async (userId, accountId) => {
      const result = await TransactionModel.updateMany(
        {
          userId,
          $or: [{ accountId: { $exists: false } }, { accountId: null }],
        },
        {
          $set: { accountId },
        },
      );
      return result.modifiedCount;
    },
    userAccountMap,
  );

  await backfillModelAccountId(
    "recurring_rules",
    async (userId, accountId) => {
      const result = await RecurringRuleModel.updateMany(
        {
          userId,
          $or: [{ accountId: { $exists: false } }, { accountId: null }],
        },
        {
          $set: { accountId },
        },
      );
      return result.modifiedCount;
    },
    userAccountMap,
  );

  await backfillModelAccountId(
    "stats_snapshots",
    async (userId, accountId) => {
      const result = await StatsSnapshotModel.updateMany(
        {
          userId,
          $or: [{ accountId: { $exists: false } }, { accountId: null }],
        },
        {
          $set: { accountId },
        },
      );
      return result.modifiedCount;
    },
    userAccountMap,
  );

  // Safety: ensure personal memberships exist and active after backfill.
  const users = await UserModel.find({}).lean();
  for (const user of users) {
    if (!user.personalAccountId) continue;

    await AccountMembershipModel.findOneAndUpdate(
      { accountId: user.personalAccountId, userId: user._id },
      {
        $set: {
          role: "owner",
          status: "active",
          leftAt: null,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  const personalAccountsCount = await AccountModel.countDocuments({ type: "personal" });
  logger.info(
    {
      users: users.length,
      personalAccounts: personalAccountsCount,
    },
    "Account migration finished",
  );

  await disconnectDb();
}

run().catch(async (err) => {
  logger.error({ err }, "Account migration failed");
  await disconnectDb();
  process.exit(1);
});
