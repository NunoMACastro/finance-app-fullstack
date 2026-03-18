import { Types } from "mongoose";
import { connectDb, disconnectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { sha256 } from "../lib/hash.js";
import { hashPassword } from "../lib/password.js";
import { lastNMonthsEndingAt, monthFromDate, monthToDate, shiftMonth } from "../lib/month.js";
import { AccountInviteCodeModel } from "../models/account-invite-code.model.js";
import { AccountMembershipModel } from "../models/account-membership.model.js";
import { AccountModel } from "../models/account.model.js";
import { BudgetModel } from "../models/budget.model.js";
import { IncomeCategoryModel } from "../models/income-category.model.js";
import { RecurringRuleModel } from "../models/recurring-rule.model.js";
import { RefreshTokenModel } from "../models/refresh-token.model.js";
import { StatsSnapshotModel } from "../models/stats-snapshot.model.js";
import { TransactionModel } from "../models/transaction.model.js";
import { UserModel } from "../models/user.model.js";
import { materializeCurrentSnapshots } from "../modules/stats/service.js";

type BudgetCategoryKind = "expense" | "reserve";
type TransactionType = "income" | "expense";
type TransactionOrigin = "manual" | "recurring";

interface BudgetCategorySeed {
  id: string;
  name: string;
  percent: number;
  colorSlot: number;
  kind: BudgetCategoryKind;
}

interface IncomeCategorySeedDoc {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  nameNormalized: string;
  active: boolean;
  isDefault: boolean;
}

interface RecurringRuleSeedDoc {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
  type: TransactionType;
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: string;
  endMonth: string | null;
  active: boolean;
  lastGenerationAt: Date | null;
  lastGenerationStatus: "ok" | "fallback" | null;
}

interface TransactionSeedDoc {
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
  month: string;
  date: Date;
  type: TransactionType;
  origin: TransactionOrigin;
  recurringRuleId: Types.ObjectId | null;
  description: string;
  amount: number;
  categoryId: string;
  categoryResolution: "direct" | "fallback";
  requestedCategoryId: string | null;
}

const SEED_EMAIL = "nunomacastro@gmail.com";
const SEED_PASSWORD = "123456";
const RECURRING_EXPENSE_FALLBACK_CATEGORY_ID = "fallback_recurring_expense";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

function keyByAccountMonth(accountId: Types.ObjectId, month: string): string {
  return `${accountId.toString()}::${month}`;
}

function dateForMonth(month: string, day: number): Date {
  const date = monthToDate(month, day);
  date.setUTCHours(10, 0, 0, 0);
  return date;
}

async function clearDatabaseCollections(): Promise<void> {
  await Promise.all([
    RefreshTokenModel.deleteMany({}),
    StatsSnapshotModel.deleteMany({}),
    TransactionModel.deleteMany({}),
    RecurringRuleModel.deleteMany({}),
    BudgetModel.deleteMany({}),
    IncomeCategoryModel.deleteMany({}),
    AccountInviteCodeModel.deleteMany({}),
    AccountMembershipModel.deleteMany({}),
    UserModel.deleteMany({}),
    AccountModel.deleteMany({}),
  ]);
}

function addIncomeCategory(
  docs: IncomeCategorySeedDoc[],
  accountId: Types.ObjectId,
  name: string,
  options?: { active?: boolean; isDefault?: boolean },
): Types.ObjectId {
  const id = new Types.ObjectId();
  docs.push({
    _id: id,
    accountId,
    name,
    nameNormalized: normalizeCategoryName(name),
    active: options?.active ?? true,
    isDefault: options?.isDefault ?? false,
  });
  return id;
}

function pushRecurringTransaction(
  transactions: TransactionSeedDoc[],
  input: {
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    month: string;
    day: number;
    type: TransactionType;
    origin: TransactionOrigin;
    recurringRuleId: Types.ObjectId | null;
    description: string;
    amount: number;
    categoryId: string;
    categoryResolution?: "direct" | "fallback";
    requestedCategoryId?: string | null;
  },
): void {
  transactions.push({
    accountId: input.accountId,
    userId: input.userId,
    month: input.month,
    date: dateForMonth(input.month, input.day),
    type: input.type,
    origin: input.origin,
    recurringRuleId: input.recurringRuleId,
    description: input.description,
    amount: roundCurrency(input.amount),
    categoryId: input.categoryId,
    categoryResolution: input.categoryResolution ?? "direct",
    requestedCategoryId: input.requestedCategoryId ?? null,
  });
}

async function run(): Promise<void> {
  await connectDb();

  const now = new Date();
  const currentMonth = monthFromDate(now);
  const months = lastNMonthsEndingAt(currentMonth, 12);
  const firstMonth = months[0];
  if (!firstMonth) {
    throw new Error("Could not determine first month for seed");
  }

  await clearDatabaseCollections();

  const userId = new Types.ObjectId();
  const personalAccountId = new Types.ObjectId();
  const sharedAccountId = new Types.ObjectId();

  await AccountModel.insertMany([
    {
      _id: personalAccountId,
      name: "Nuno Castro (Pessoal)",
      type: "personal",
      createdByUserId: userId,
    },
    {
      _id: sharedAccountId,
      name: "Casa Nuno",
      type: "shared",
      createdByUserId: userId,
    },
  ]);

  await UserModel.create({
    _id: userId,
    email: SEED_EMAIL,
    passwordHash: await hashPassword(SEED_PASSWORD),
    profile: {
      name: "Nuno Castro",
      currency: "EUR",
    },
    preferences: {
      themePalette: "brisa",
      hideAmountsByDefault: false,
    },
    tutorialSeenAt: new Date("2026-03-01T10:00:00.000Z"),
    status: "active",
    deletedAt: null,
    personalAccountId,
  });

  await AccountMembershipModel.insertMany([
    {
      accountId: personalAccountId,
      userId,
      role: "owner",
      status: "active",
      leftAt: null,
    },
    {
      accountId: sharedAccountId,
      userId,
      role: "owner",
      status: "active",
      leftAt: null,
    },
  ]);

  const incomeCategoryDocs: IncomeCategorySeedDoc[] = [];

  const personalIncomeDefaultId = addIncomeCategory(incomeCategoryDocs, personalAccountId, "Outras receitas", {
    isDefault: true,
  });
  const personalIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, personalAccountId, "Salario");
  const personalIncomeFreelanceId = addIncomeCategory(incomeCategoryDocs, personalAccountId, "Freelance");
  addIncomeCategory(incomeCategoryDocs, personalAccountId, "Bonus antigo", { active: false });

  const sharedIncomeDefaultId = addIncomeCategory(incomeCategoryDocs, sharedAccountId, "Outras receitas", {
    isDefault: true,
  });
  const sharedIncomeContributionId = addIncomeCategory(incomeCategoryDocs, sharedAccountId, "Contribuicao mensal");
  const sharedIncomeReimburseId = addIncomeCategory(incomeCategoryDocs, sharedAccountId, "Reembolsos");
  addIncomeCategory(incomeCategoryDocs, sharedAccountId, "Transferencias antigas", { active: false });

  await IncomeCategoryModel.insertMany(incomeCategoryDocs);

  const recurringRules: RecurringRuleSeedDoc[] = [];

  const personalSalaryRuleId = new Types.ObjectId();
  const personalRentRuleId = new Types.ObjectId();
  const personalSubscriptionRuleId = new Types.ObjectId();
  const personalInactiveRuleId = new Types.ObjectId();
  const sharedContributionRuleId = new Types.ObjectId();
  const sharedUtilitiesRuleId = new Types.ObjectId();

  recurringRules.push(
    {
      _id: personalSalaryRuleId,
      accountId: personalAccountId,
      userId,
      type: "income",
      name: "Salario",
      amount: 2950,
      dayOfMonth: 1,
      categoryId: personalIncomeSalaryId.toString(),
      startMonth: firstMonth,
      endMonth: null,
      active: true,
      lastGenerationAt: dateForMonth(currentMonth, 1),
      lastGenerationStatus: "ok",
    },
    {
      _id: personalRentRuleId,
      accountId: personalAccountId,
      userId,
      type: "expense",
      name: "Renda",
      amount: 920,
      dayOfMonth: 5,
      categoryId: "cat_habitacao",
      startMonth: firstMonth,
      endMonth: null,
      active: true,
      lastGenerationAt: dateForMonth(currentMonth, 5),
      lastGenerationStatus: "ok",
    },
    {
      _id: personalSubscriptionRuleId,
      accountId: personalAccountId,
      userId,
      type: "expense",
      name: "Subscricoes digitais",
      amount: 29.99,
      dayOfMonth: 12,
      categoryId: "cat_subscriptions",
      startMonth: firstMonth,
      endMonth: null,
      active: true,
      lastGenerationAt: dateForMonth(currentMonth, 12),
      lastGenerationStatus: "fallback",
    },
    {
      _id: personalInactiveRuleId,
      accountId: personalAccountId,
      userId,
      type: "expense",
      name: "Regra antiga (inativa)",
      amount: 18,
      dayOfMonth: 24,
      categoryId: "cat_lazer",
      startMonth: shiftMonth(firstMonth, -2),
      endMonth: shiftMonth(firstMonth, -1),
      active: false,
      lastGenerationAt: null,
      lastGenerationStatus: null,
    },
    {
      _id: sharedContributionRuleId,
      accountId: sharedAccountId,
      userId,
      type: "income",
      name: "Contribuicao para despesas da casa",
      amount: 1600,
      dayOfMonth: 1,
      categoryId: sharedIncomeContributionId.toString(),
      startMonth: firstMonth,
      endMonth: null,
      active: true,
      lastGenerationAt: dateForMonth(currentMonth, 1),
      lastGenerationStatus: "ok",
    },
    {
      _id: sharedUtilitiesRuleId,
      accountId: sharedAccountId,
      userId,
      type: "expense",
      name: "Servicos da casa",
      amount: 320,
      dayOfMonth: 8,
      categoryId: "cat_shared_servicos",
      startMonth: firstMonth,
      endMonth: null,
      active: true,
      lastGenerationAt: dateForMonth(currentMonth, 8),
      lastGenerationStatus: "ok",
    },
  );

  await RecurringRuleModel.insertMany(recurringRules);

  const transactions: TransactionSeedDoc[] = [];

  months.forEach((month, index) => {
    const personalSalary = 2950 + index * 20;
    const personalRent = 920 + index * 2;
    const personalSubscription = 29.99 + (index % 4 === 0 ? 2 : 0);
    const personalGroceries = 350 + index * 6;
    const personalTransport = 120 + (index % 5) * 4;
    const personalLeisure = 95 + (index % 3) * 16;
    const personalReserve = 420 + index * 9;

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 1,
      type: "income",
      origin: "recurring",
      recurringRuleId: personalSalaryRuleId,
      description: "Salario",
      amount: personalSalary,
      categoryId: personalIncomeSalaryId.toString(),
    });

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 5,
      type: "expense",
      origin: "recurring",
      recurringRuleId: personalRentRuleId,
      description: "Renda",
      amount: personalRent,
      categoryId: "cat_habitacao",
    });

    const shouldFallbackSubscription = index === months.length - 2;
    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 12,
      type: "expense",
      origin: "recurring",
      recurringRuleId: personalSubscriptionRuleId,
      description: "Subscricoes digitais",
      amount: personalSubscription,
      categoryId: shouldFallbackSubscription
        ? RECURRING_EXPENSE_FALLBACK_CATEGORY_ID
        : "cat_subscriptions",
      categoryResolution: shouldFallbackSubscription ? "fallback" : "direct",
      requestedCategoryId: shouldFallbackSubscription ? "cat_subscriptions" : null,
    });

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 9,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Supermercado",
      amount: personalGroceries,
      categoryId: "cat_mercado",
    });

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 16,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Transportes",
      amount: personalTransport,
      categoryId: "cat_mobilidade",
    });

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 21,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Lazer",
      amount: personalLeisure,
      categoryId: "cat_lazer",
    });

    pushRecurringTransaction(transactions, {
      accountId: personalAccountId,
      userId,
      month,
      day: 23,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Transferencia para poupanca",
      amount: personalReserve,
      categoryId: "cat_poupanca",
    });

    if (index % 3 === 0) {
      pushRecurringTransaction(transactions, {
        accountId: personalAccountId,
        userId,
        month,
        day: 26,
        type: "income",
        origin: "manual",
        recurringRuleId: null,
        description: "Projeto freelance",
        amount: 420 + index * 15,
        categoryId: personalIncomeFreelanceId.toString(),
      });
    }

    const sharedContribution = 1600 + index * 12;
    const sharedUtilities = 320 + index * 4;
    const sharedGroceries = 520 + index * 11;
    const sharedLeisure = 140 + (index % 4) * 20;

    pushRecurringTransaction(transactions, {
      accountId: sharedAccountId,
      userId,
      month,
      day: 1,
      type: "income",
      origin: "recurring",
      recurringRuleId: sharedContributionRuleId,
      description: "Contribuicao para despesas da casa",
      amount: sharedContribution,
      categoryId: sharedIncomeContributionId.toString(),
    });

    pushRecurringTransaction(transactions, {
      accountId: sharedAccountId,
      userId,
      month,
      day: 8,
      type: "expense",
      origin: "recurring",
      recurringRuleId: sharedUtilitiesRuleId,
      description: "Servicos da casa",
      amount: sharedUtilities,
      categoryId: "cat_shared_servicos",
    });

    pushRecurringTransaction(transactions, {
      accountId: sharedAccountId,
      userId,
      month,
      day: 14,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Compras da casa",
      amount: sharedGroceries,
      categoryId: "cat_shared_mercado",
    });

    pushRecurringTransaction(transactions, {
      accountId: sharedAccountId,
      userId,
      month,
      day: 19,
      type: "expense",
      origin: "manual",
      recurringRuleId: null,
      description: "Lazer em casa",
      amount: sharedLeisure,
      categoryId: "cat_shared_lazer",
    });

    if (index % 4 === 1) {
      pushRecurringTransaction(transactions, {
        accountId: sharedAccountId,
        userId,
        month,
        day: 27,
        type: "income",
        origin: "manual",
        recurringRuleId: null,
        description: "Reembolso de despesas",
        amount: 180 + index * 10,
        categoryId: sharedIncomeReimburseId.toString(),
      });
    }

    if (index === months.length - 1) {
      pushRecurringTransaction(transactions, {
        accountId: sharedAccountId,
        userId,
        month,
        day: 25,
        type: "income",
        origin: "manual",
        recurringRuleId: null,
        description: "Acerto mensal",
        amount: 95,
        categoryId: sharedIncomeDefaultId.toString(),
      });
    }

    if (index === months.length - 1) {
      pushRecurringTransaction(transactions, {
        accountId: personalAccountId,
        userId,
        month,
        day: 28,
        type: "income",
        origin: "manual",
        recurringRuleId: null,
        description: "Acerto pontual",
        amount: 110,
        categoryId: personalIncomeDefaultId.toString(),
      });
    }
  });

  await TransactionModel.insertMany(transactions);

  const personalBudgetCategories: BudgetCategorySeed[] = [
    { id: "cat_habitacao", name: "Habitacao", percent: 32, colorSlot: 1, kind: "expense" },
    { id: "cat_mercado", name: "Mercado", percent: 18, colorSlot: 2, kind: "expense" },
    { id: "cat_mobilidade", name: "Mobilidade", percent: 10, colorSlot: 3, kind: "expense" },
    { id: "cat_subscriptions", name: "Subscricoes", percent: 8, colorSlot: 4, kind: "expense" },
    { id: "cat_lazer", name: "Lazer", percent: 7, colorSlot: 5, kind: "expense" },
    { id: "cat_poupanca", name: "Poupanca", percent: 25, colorSlot: 6, kind: "reserve" },
    {
      id: RECURRING_EXPENSE_FALLBACK_CATEGORY_ID,
      name: "Sem categoria (recorrente)",
      percent: 0,
      colorSlot: 9,
      kind: "expense",
    },
  ];

  const sharedBudgetCategories: BudgetCategorySeed[] = [
    { id: "cat_shared_habitacao", name: "Habitacao", percent: 38, colorSlot: 1, kind: "expense" },
    { id: "cat_shared_mercado", name: "Mercado", percent: 27, colorSlot: 2, kind: "expense" },
    { id: "cat_shared_servicos", name: "Servicos", percent: 15, colorSlot: 3, kind: "expense" },
    { id: "cat_shared_lazer", name: "Lazer", percent: 8, colorSlot: 4, kind: "expense" },
    { id: "cat_shared_reserva", name: "Reserva", percent: 12, colorSlot: 7, kind: "reserve" },
    {
      id: RECURRING_EXPENSE_FALLBACK_CATEGORY_ID,
      name: "Sem categoria (recorrente)",
      percent: 0,
      colorSlot: 9,
      kind: "expense",
    },
  ];

  const incomeTotalsByAccountMonth = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "income") continue;
    const key = keyByAccountMonth(transaction.accountId, transaction.month);
    incomeTotalsByAccountMonth.set(
      key,
      roundCurrency((incomeTotalsByAccountMonth.get(key) ?? 0) + transaction.amount),
    );
  }

  const budgetDocs: Array<{
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    month: string;
    totalBudget: number;
    categories: BudgetCategorySeed[];
  }> = [];

  for (const month of months) {
    budgetDocs.push({
      accountId: personalAccountId,
      userId,
      month,
      totalBudget: incomeTotalsByAccountMonth.get(keyByAccountMonth(personalAccountId, month)) ?? 0,
      categories: personalBudgetCategories,
    });

    budgetDocs.push({
      accountId: sharedAccountId,
      userId,
      month,
      totalBudget: incomeTotalsByAccountMonth.get(keyByAccountMonth(sharedAccountId, month)) ?? 0,
      categories: sharedBudgetCategories,
    });
  }

  await BudgetModel.insertMany(budgetDocs);

  await AccountInviteCodeModel.insertMany([
    {
      accountId: sharedAccountId,
      codeHash: sha256("CASANUNO1"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdByUserId: userId,
    },
    {
      accountId: sharedAccountId,
      codeHash: sha256("CASAARCH1"),
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdByUserId: userId,
    },
  ]);

  const tokenExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const revokedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await RefreshTokenModel.insertMany([
    {
      userId,
      jti: "seed-nuno-active-1",
      tokenHash: sha256("seed_refresh_token_nuno_active"),
      expiresAt: tokenExpiry,
      revokedAt: null,
      replacedByJti: null,
      deviceInfo: "Seed iPhone",
    },
    {
      userId,
      jti: "seed-nuno-revoked-1",
      tokenHash: sha256("seed_refresh_token_nuno_revoked"),
      expiresAt: tokenExpiry,
      revokedAt,
      replacedByJti: "seed-nuno-active-1",
      deviceInfo: "Seed MacBook",
    },
  ]);

  await materializeCurrentSnapshots(personalAccountId.toString());
  await materializeCurrentSnapshots(sharedAccountId.toString());

  const [
    usersCount,
    accountsCount,
    membershipsCount,
    incomeCategoriesCount,
    recurringRulesCount,
    budgetsCount,
    transactionsCount,
    statsSnapshotsCount,
    invitesCount,
    refreshTokensCount,
  ] = await Promise.all([
    UserModel.countDocuments({}),
    AccountModel.countDocuments({}),
    AccountMembershipModel.countDocuments({}),
    IncomeCategoryModel.countDocuments({}),
    RecurringRuleModel.countDocuments({}),
    BudgetModel.countDocuments({}),
    TransactionModel.countDocuments({}),
    StatsSnapshotModel.countDocuments({}),
    AccountInviteCodeModel.countDocuments({}),
    RefreshTokenModel.countDocuments({}),
  ]);

  logger.info(
    {
      months,
      credentials: {
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      },
      totals: {
        users: usersCount,
        accounts: accountsCount,
        memberships: membershipsCount,
        incomeCategories: incomeCategoriesCount,
        recurringRules: recurringRulesCount,
        budgets: budgetsCount,
        transactions: transactionsCount,
        statsSnapshots: statsSnapshotsCount,
        accountInviteCodes: invitesCount,
        refreshTokens: refreshTokensCount,
      },
      note: {
        sharedInviteCodePlain: "CASANUNO1",
      },
    },
    "Database seeded successfully",
  );
}

run()
  .catch(async (err) => {
    logger.error({ err }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
