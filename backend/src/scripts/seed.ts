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

type ThemePalette = "brisa" | "calma" | "aurora" | "terra";
type BudgetCategoryKind = "expense" | "reserve";
type TransactionType = "income" | "expense";

interface BudgetCategorySeed {
  id: string;
  name: string;
  percent: number;
  colorSlot: number;
  kind: BudgetCategoryKind;
}

interface SeedAccountActivityInput {
  accountId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  months: string[];
  incomeDefaultCategoryId: Types.ObjectId;
  incomeSalaryCategoryId: Types.ObjectId;
  incomeExtraCategoryId: Types.ObjectId;
  salaryRuleName: string;
  salaryBase: number;
  salaryStep: number;
  fixedExpenseRuleName: string;
  fixedExpenseBase: number;
  fixedExpenseStep: number;
  fixedExpenseCategoryId: string;
  groceriesCategoryId: string;
  mobilityCategoryId: string;
  leisureCategoryId: string;
  manualExpenseBase: number;
  extraIncomeLabel: string;
  extraIncomeBase: number;
}

interface SeedUser {
  id: Types.ObjectId;
  personalAccountId: Types.ObjectId;
  name: string;
  email: string;
  currency: string;
  themePalette: ThemePalette;
  hideAmountsByDefault: boolean;
  tutorialSeenAt: Date | null;
}

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
  docs: Array<{
    _id: Types.ObjectId;
    accountId: Types.ObjectId;
    name: string;
    nameNormalized: string;
    active: boolean;
    isDefault: boolean;
  }>,
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

function seedAccountActivity(
  input: SeedAccountActivityInput,
  recurringRules: Array<{
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
  }>,
  transactions: Array<{
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    month: string;
    date: Date;
    type: TransactionType;
    origin: "manual" | "recurring";
    recurringRuleId: Types.ObjectId | null;
    description: string;
    amount: number;
    categoryId: string;
  }>,
): void {
  const firstMonth = input.months[0];
  if (!firstMonth) {
    throw new Error("No months provided for seed activity");
  }

  const salaryRuleId = new Types.ObjectId();
  const fixedExpenseRuleId = new Types.ObjectId();
  const archivedRuleId = new Types.ObjectId();

  recurringRules.push(
    {
      _id: salaryRuleId,
      accountId: input.accountId,
      userId: input.actorUserId,
      type: "income",
      name: input.salaryRuleName,
      amount: input.salaryBase,
      dayOfMonth: 1,
      categoryId: input.incomeSalaryCategoryId.toString(),
      startMonth: firstMonth,
      endMonth: null,
      active: true,
    },
    {
      _id: fixedExpenseRuleId,
      accountId: input.accountId,
      userId: input.actorUserId,
      type: "expense",
      name: input.fixedExpenseRuleName,
      amount: input.fixedExpenseBase,
      dayOfMonth: 5,
      categoryId: input.fixedExpenseCategoryId,
      startMonth: firstMonth,
      endMonth: null,
      active: true,
    },
    {
      _id: archivedRuleId,
      accountId: input.accountId,
      userId: input.actorUserId,
      type: "expense",
      name: "Regra antiga (inativa)",
      amount: 25,
      dayOfMonth: 27,
      categoryId: input.leisureCategoryId,
      startMonth: shiftMonth(firstMonth, -2),
      endMonth: shiftMonth(firstMonth, -1),
      active: false,
    },
  );

  input.months.forEach((month, index) => {
    const salaryAmount = roundCurrency(input.salaryBase + input.salaryStep * index);
    const fixedExpenseAmount = roundCurrency(input.fixedExpenseBase + input.fixedExpenseStep * index);
    const groceriesAmount = roundCurrency(input.manualExpenseBase + index * 7);
    const mobilityAmount = roundCurrency(input.manualExpenseBase * 0.58 + index * 3);
    const leisureAmount = roundCurrency(input.manualExpenseBase * 0.42 + (index % 3) * 9);

    transactions.push(
      {
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 1),
        type: "income",
        origin: "recurring",
        recurringRuleId: salaryRuleId,
        description: input.salaryRuleName,
        amount: salaryAmount,
        categoryId: input.incomeSalaryCategoryId.toString(),
      },
      {
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 5),
        type: "expense",
        origin: "recurring",
        recurringRuleId: fixedExpenseRuleId,
        description: input.fixedExpenseRuleName,
        amount: fixedExpenseAmount,
        categoryId: input.fixedExpenseCategoryId,
      },
      {
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 9),
        type: "expense",
        origin: "manual",
        recurringRuleId: null,
        description: "Supermercado",
        amount: groceriesAmount,
        categoryId: input.groceriesCategoryId,
      },
      {
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 14),
        type: "expense",
        origin: "manual",
        recurringRuleId: null,
        description: "Transportes",
        amount: mobilityAmount,
        categoryId: input.mobilityCategoryId,
      },
      {
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 20),
        type: "expense",
        origin: "manual",
        recurringRuleId: null,
        description: "Lazer",
        amount: leisureAmount,
        categoryId: input.leisureCategoryId,
      },
    );

    if (index % 2 === 0) {
      transactions.push({
        accountId: input.accountId,
        userId: input.actorUserId,
        month,
        date: dateForMonth(month, 18),
        type: "income",
        origin: "manual",
        recurringRuleId: null,
        description: input.extraIncomeLabel,
        amount: roundCurrency(input.extraIncomeBase + index * 45),
        categoryId: input.incomeExtraCategoryId.toString(),
      });
    }
  });

  const latestMonth = input.months[input.months.length - 1];
  if (!latestMonth) {
    throw new Error("No latest month found for account seed activity");
  }

  transactions.push({
    accountId: input.accountId,
    userId: input.actorUserId,
    month: latestMonth,
    date: dateForMonth(latestMonth, 26),
    type: "income",
    origin: "manual",
    recurringRuleId: null,
    description: "Acerto pontual",
    amount: 95,
    categoryId: input.incomeDefaultCategoryId.toString(),
  });
}

async function run(): Promise<void> {
  await connectDb();

  const now = new Date();
  const currentMonth = monthFromDate(now);
  const months = lastNMonthsEndingAt(currentMonth, 6);
  const firstMonth = months[0];
  if (!firstMonth) {
    throw new Error("Could not determine first month for seed");
  }

  await clearDatabaseCollections();

  const sharedPasswordHash = await hashPassword("123456");

  const userAnaId = new Types.ObjectId();
  const userBrunoId = new Types.ObjectId();
  const userCarlaId = new Types.ObjectId();

  const accountAnaPersonalId = new Types.ObjectId();
  const accountBrunoPersonalId = new Types.ObjectId();
  const accountCarlaPersonalId = new Types.ObjectId();
  const accountSharedHomeId = new Types.ObjectId();
  const accountSharedTripId = new Types.ObjectId();

  const users: SeedUser[] = [
    {
      id: userAnaId,
      personalAccountId: accountAnaPersonalId,
      name: "Ana Martins",
      email: "ana.seed@finance.local",
      currency: "EUR",
      themePalette: "brisa",
      hideAmountsByDefault: false,
      tutorialSeenAt: new Date("2026-02-10T08:00:00.000Z"),
    },
    {
      id: userBrunoId,
      personalAccountId: accountBrunoPersonalId,
      name: "Bruno Silva",
      email: "bruno.seed@finance.local",
      currency: "EUR",
      themePalette: "calma",
      hideAmountsByDefault: true,
      tutorialSeenAt: null,
    },
    {
      id: userCarlaId,
      personalAccountId: accountCarlaPersonalId,
      name: "Carla Sousa",
      email: "carla.seed@finance.local",
      currency: "EUR",
      themePalette: "aurora",
      hideAmountsByDefault: false,
      tutorialSeenAt: new Date("2026-01-20T09:30:00.000Z"),
    },
  ];

  await AccountModel.insertMany([
    {
      _id: accountAnaPersonalId,
      name: "Ana Martins (Pessoal)",
      type: "personal",
      createdByUserId: userAnaId,
    },
    {
      _id: accountBrunoPersonalId,
      name: "Bruno Silva (Pessoal)",
      type: "personal",
      createdByUserId: userBrunoId,
    },
    {
      _id: accountCarlaPersonalId,
      name: "Carla Sousa (Pessoal)",
      type: "personal",
      createdByUserId: userCarlaId,
    },
    {
      _id: accountSharedHomeId,
      name: "Casa & Familia",
      type: "shared",
      createdByUserId: userAnaId,
    },
    {
      _id: accountSharedTripId,
      name: "Roadtrip Verao 2026",
      type: "shared",
      createdByUserId: userBrunoId,
    },
  ]);

  await UserModel.insertMany(
    users.map((user) => ({
      _id: user.id,
      email: user.email,
      passwordHash: sharedPasswordHash,
      profile: {
        name: user.name,
        currency: user.currency,
      },
      preferences: {
        themePalette: user.themePalette,
        hideAmountsByDefault: user.hideAmountsByDefault,
      },
      tutorialSeenAt: user.tutorialSeenAt,
      status: "active",
      deletedAt: null,
      personalAccountId: user.personalAccountId,
    })),
  );

  await AccountMembershipModel.insertMany([
    { accountId: accountAnaPersonalId, userId: userAnaId, role: "owner", status: "active", leftAt: null },
    { accountId: accountBrunoPersonalId, userId: userBrunoId, role: "owner", status: "active", leftAt: null },
    { accountId: accountCarlaPersonalId, userId: userCarlaId, role: "owner", status: "active", leftAt: null },
    { accountId: accountSharedHomeId, userId: userAnaId, role: "owner", status: "active", leftAt: null },
    { accountId: accountSharedHomeId, userId: userBrunoId, role: "editor", status: "active", leftAt: null },
    { accountId: accountSharedHomeId, userId: userCarlaId, role: "viewer", status: "active", leftAt: null },
    { accountId: accountSharedTripId, userId: userBrunoId, role: "owner", status: "active", leftAt: null },
    { accountId: accountSharedTripId, userId: userAnaId, role: "editor", status: "active", leftAt: null },
    {
      accountId: accountSharedTripId,
      userId: userCarlaId,
      role: "viewer",
      status: "inactive",
      leftAt: new Date("2026-02-01T10:00:00.000Z"),
    },
  ]);

  const incomeCategoryDocs: Array<{
    _id: Types.ObjectId;
    accountId: Types.ObjectId;
    name: string;
    nameNormalized: string;
    active: boolean;
    isDefault: boolean;
  }> = [];

  const anaPersonalIncomeDefaultId = addIncomeCategory(
    incomeCategoryDocs,
    accountAnaPersonalId,
    "Outras receitas",
    { isDefault: true },
  );
  const anaPersonalIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, accountAnaPersonalId, "Salario");
  const anaPersonalIncomeExtraId = addIncomeCategory(incomeCategoryDocs, accountAnaPersonalId, "Freelance");
  addIncomeCategory(incomeCategoryDocs, accountAnaPersonalId, "Bonus antigo", { active: false });

  const brunoPersonalIncomeDefaultId = addIncomeCategory(
    incomeCategoryDocs,
    accountBrunoPersonalId,
    "Outras receitas",
    { isDefault: true },
  );
  const brunoPersonalIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, accountBrunoPersonalId, "Salario");
  const brunoPersonalIncomeExtraId = addIncomeCategory(incomeCategoryDocs, accountBrunoPersonalId, "Consultoria");
  addIncomeCategory(incomeCategoryDocs, accountBrunoPersonalId, "Comissoes antigas", { active: false });

  const carlaPersonalIncomeDefaultId = addIncomeCategory(
    incomeCategoryDocs,
    accountCarlaPersonalId,
    "Outras receitas",
    { isDefault: true },
  );
  const carlaPersonalIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, accountCarlaPersonalId, "Salario");
  const carlaPersonalIncomeExtraId = addIncomeCategory(incomeCategoryDocs, accountCarlaPersonalId, "Aulas");
  addIncomeCategory(incomeCategoryDocs, accountCarlaPersonalId, "Projetos antigos", { active: false });

  const sharedHomeIncomeDefaultId = addIncomeCategory(
    incomeCategoryDocs,
    accountSharedHomeId,
    "Outras receitas",
    { isDefault: true },
  );
  const sharedHomeIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, accountSharedHomeId, "Salarios");
  const sharedHomeIncomeExtraId = addIncomeCategory(incomeCategoryDocs, accountSharedHomeId, "Reembolsos");
  addIncomeCategory(incomeCategoryDocs, accountSharedHomeId, "Vendidos em segunda mao");

  const sharedTripIncomeDefaultId = addIncomeCategory(
    incomeCategoryDocs,
    accountSharedTripId,
    "Outras receitas",
    { isDefault: true },
  );
  const sharedTripIncomeSalaryId = addIncomeCategory(incomeCategoryDocs, accountSharedTripId, "Poupanca viagem");
  const sharedTripIncomeExtraId = addIncomeCategory(incomeCategoryDocs, accountSharedTripId, "Acertos");
  addIncomeCategory(incomeCategoryDocs, accountSharedTripId, "Patrocinios", { active: false });

  await IncomeCategoryModel.insertMany(incomeCategoryDocs);

  const recurringRules: Array<{
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
  }> = [];

  const transactions: Array<{
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    month: string;
    date: Date;
    type: TransactionType;
    origin: "manual" | "recurring";
    recurringRuleId: Types.ObjectId | null;
    description: string;
    amount: number;
    categoryId: string;
  }> = [];

  seedAccountActivity(
    {
      accountId: accountAnaPersonalId,
      actorUserId: userAnaId,
      months,
      incomeDefaultCategoryId: anaPersonalIncomeDefaultId,
      incomeSalaryCategoryId: anaPersonalIncomeSalaryId,
      incomeExtraCategoryId: anaPersonalIncomeExtraId,
      salaryRuleName: "Salario Ana",
      salaryBase: 2200,
      salaryStep: 45,
      fixedExpenseRuleName: "Renda casa Ana",
      fixedExpenseBase: 780,
      fixedExpenseStep: 5,
      fixedExpenseCategoryId: "cat_habitacao",
      groceriesCategoryId: "cat_mercado",
      mobilityCategoryId: "cat_mobilidade",
      leisureCategoryId: "cat_lazer",
      manualExpenseBase: 300,
      extraIncomeLabel: "Projeto freelance",
      extraIncomeBase: 340,
    },
    recurringRules,
    transactions,
  );

  seedAccountActivity(
    {
      accountId: accountBrunoPersonalId,
      actorUserId: userBrunoId,
      months,
      incomeDefaultCategoryId: brunoPersonalIncomeDefaultId,
      incomeSalaryCategoryId: brunoPersonalIncomeSalaryId,
      incomeExtraCategoryId: brunoPersonalIncomeExtraId,
      salaryRuleName: "Salario Bruno",
      salaryBase: 2500,
      salaryStep: 35,
      fixedExpenseRuleName: "Prestacao carro",
      fixedExpenseBase: 360,
      fixedExpenseStep: 2,
      fixedExpenseCategoryId: "cat_mobilidade",
      groceriesCategoryId: "cat_mercado",
      mobilityCategoryId: "cat_mobilidade",
      leisureCategoryId: "cat_lazer",
      manualExpenseBase: 260,
      extraIncomeLabel: "Consultoria",
      extraIncomeBase: 280,
    },
    recurringRules,
    transactions,
  );

  seedAccountActivity(
    {
      accountId: accountCarlaPersonalId,
      actorUserId: userCarlaId,
      months,
      incomeDefaultCategoryId: carlaPersonalIncomeDefaultId,
      incomeSalaryCategoryId: carlaPersonalIncomeSalaryId,
      incomeExtraCategoryId: carlaPersonalIncomeExtraId,
      salaryRuleName: "Salario Carla",
      salaryBase: 1850,
      salaryStep: 30,
      fixedExpenseRuleName: "Renda quarto",
      fixedExpenseBase: 520,
      fixedExpenseStep: 4,
      fixedExpenseCategoryId: "cat_habitacao",
      groceriesCategoryId: "cat_mercado",
      mobilityCategoryId: "cat_mobilidade",
      leisureCategoryId: "cat_lazer",
      manualExpenseBase: 190,
      extraIncomeLabel: "Aulas particulares",
      extraIncomeBase: 160,
    },
    recurringRules,
    transactions,
  );

  seedAccountActivity(
    {
      accountId: accountSharedHomeId,
      actorUserId: userAnaId,
      months,
      incomeDefaultCategoryId: sharedHomeIncomeDefaultId,
      incomeSalaryCategoryId: sharedHomeIncomeSalaryId,
      incomeExtraCategoryId: sharedHomeIncomeExtraId,
      salaryRuleName: "Entrada conjunta",
      salaryBase: 3900,
      salaryStep: 70,
      fixedExpenseRuleName: "Prestacao habitacao",
      fixedExpenseBase: 1350,
      fixedExpenseStep: 8,
      fixedExpenseCategoryId: "cat_habitacao",
      groceriesCategoryId: "cat_mercado",
      mobilityCategoryId: "cat_mobilidade",
      leisureCategoryId: "cat_lazer",
      manualExpenseBase: 520,
      extraIncomeLabel: "Reembolso despesas",
      extraIncomeBase: 210,
    },
    recurringRules,
    transactions,
  );

  seedAccountActivity(
    {
      accountId: accountSharedTripId,
      actorUserId: userBrunoId,
      months,
      incomeDefaultCategoryId: sharedTripIncomeDefaultId,
      incomeSalaryCategoryId: sharedTripIncomeSalaryId,
      incomeExtraCategoryId: sharedTripIncomeExtraId,
      salaryRuleName: "Poupanca mensal viagem",
      salaryBase: 700,
      salaryStep: 20,
      fixedExpenseRuleName: "Reserva alojamento",
      fixedExpenseBase: 230,
      fixedExpenseStep: 6,
      fixedExpenseCategoryId: "cat_trip_alojamento",
      groceriesCategoryId: "cat_trip_refeicoes",
      mobilityCategoryId: "cat_trip_transportes",
      leisureCategoryId: "cat_trip_experiencias",
      manualExpenseBase: 140,
      extraIncomeLabel: "Acerto entre amigos",
      extraIncomeBase: 90,
    },
    recurringRules,
    transactions,
  );

  await RecurringRuleModel.insertMany(recurringRules);
  await TransactionModel.insertMany(transactions);

  const personalBudgetCategories: BudgetCategorySeed[] = [
    { id: "cat_habitacao", name: "Habitacao", percent: 35, colorSlot: 1, kind: "expense" },
    { id: "cat_mercado", name: "Mercado", percent: 20, colorSlot: 2, kind: "expense" },
    { id: "cat_mobilidade", name: "Mobilidade", percent: 10, colorSlot: 3, kind: "expense" },
    { id: "cat_lazer", name: "Lazer", percent: 10, colorSlot: 4, kind: "expense" },
    { id: "cat_poupanca", name: "Poupanca", percent: 25, colorSlot: 5, kind: "reserve" },
  ];

  const sharedTripBudgetCategories: BudgetCategorySeed[] = [
    { id: "cat_trip_transportes", name: "Transportes", percent: 30, colorSlot: 6, kind: "expense" },
    { id: "cat_trip_alojamento", name: "Alojamento", percent: 35, colorSlot: 7, kind: "expense" },
    { id: "cat_trip_refeicoes", name: "Refeicoes", percent: 15, colorSlot: 8, kind: "expense" },
    { id: "cat_trip_experiencias", name: "Experiencias", percent: 10, colorSlot: 9, kind: "expense" },
    { id: "cat_trip_reserva", name: "Reserva", percent: 10, colorSlot: 5, kind: "reserve" },
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

  const accountBudgetTemplates: Array<{
    accountId: Types.ObjectId;
    actorUserId: Types.ObjectId;
    categories: BudgetCategorySeed[];
  }> = [
    { accountId: accountAnaPersonalId, actorUserId: userAnaId, categories: personalBudgetCategories },
    { accountId: accountBrunoPersonalId, actorUserId: userBrunoId, categories: personalBudgetCategories },
    { accountId: accountCarlaPersonalId, actorUserId: userCarlaId, categories: personalBudgetCategories },
    { accountId: accountSharedHomeId, actorUserId: userAnaId, categories: personalBudgetCategories },
    { accountId: accountSharedTripId, actorUserId: userBrunoId, categories: sharedTripBudgetCategories },
  ];

  const budgetDocs: Array<{
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    month: string;
    totalBudget: number;
    categories: BudgetCategorySeed[];
  }> = [];

  for (const template of accountBudgetTemplates) {
    for (const month of months) {
      const key = keyByAccountMonth(template.accountId, month);
      budgetDocs.push({
        accountId: template.accountId,
        userId: template.actorUserId,
        month,
        totalBudget: incomeTotalsByAccountMonth.get(key) ?? 0,
        categories: template.categories,
      });
    }
  }

  await BudgetModel.insertMany(budgetDocs);

  await AccountInviteCodeModel.insertMany([
    {
      accountId: accountSharedHomeId,
      codeHash: sha256("CASAFAM1"),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdByUserId: userAnaId,
    },
    {
      accountId: accountSharedHomeId,
      codeHash: sha256("CASAOLD1"),
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdByUserId: userAnaId,
    },
    {
      accountId: accountSharedTripId,
      codeHash: sha256("ROADTRP1"),
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdByUserId: userBrunoId,
    },
  ]);

  const tokenExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const revokedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  await RefreshTokenModel.insertMany([
    {
      userId: userAnaId,
      jti: "seed-ana-active-1",
      tokenHash: sha256("seed_refresh_token_ana_active"),
      expiresAt: tokenExpiry,
      revokedAt: null,
      replacedByJti: null,
      deviceInfo: "Seed iPhone",
    },
    {
      userId: userAnaId,
      jti: "seed-ana-revoked-1",
      tokenHash: sha256("seed_refresh_token_ana_revoked"),
      expiresAt: tokenExpiry,
      revokedAt,
      replacedByJti: "seed-ana-active-1",
      deviceInfo: "Seed Chrome",
    },
    {
      userId: userBrunoId,
      jti: "seed-bruno-active-1",
      tokenHash: sha256("seed_refresh_token_bruno_active"),
      expiresAt: tokenExpiry,
      revokedAt: null,
      replacedByJti: null,
      deviceInfo: "Seed MacBook",
    },
    {
      userId: userCarlaId,
      jti: "seed-carla-active-1",
      tokenHash: sha256("seed_refresh_token_carla_active"),
      expiresAt: tokenExpiry,
      revokedAt: null,
      replacedByJti: null,
      deviceInfo: "Seed Android",
    },
  ]);

  const accountIds = [
    accountAnaPersonalId,
    accountBrunoPersonalId,
    accountCarlaPersonalId,
    accountSharedHomeId,
    accountSharedTripId,
  ];
  for (const accountId of accountIds) {
    await materializeCurrentSnapshots(accountId.toString());
  }

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
        email: users.map((user) => user.email),
        password: "123456",
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
        sharedHomeInviteCodePlain: "CASAFAM1",
        sharedTripInviteCodePlain: "ROADTRP1",
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
