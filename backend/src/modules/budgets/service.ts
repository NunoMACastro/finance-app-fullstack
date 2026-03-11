import { BudgetModel } from "../../models/budget.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { newCategoryId } from "../../lib/hash.js";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { Types } from "mongoose";

interface BudgetCategoryDto {
  id: string;
  name: string;
  percent: number;
}

interface MonthBudgetDto {
  accountId: string;
  month: string;
  totalBudget: number;
  categories: BudgetCategoryDto[];
  isReady: boolean;
}

interface BudgetTemplateDto {
  id: string;
  name: string;
  categories: BudgetCategoryDto[];
}

const BUDGET_TOLERANCE = 0.01;

const BUDGET_TEMPLATES: BudgetTemplateDto[] = [
  {
    id: "conservador",
    name: "Conservador",
    categories: [
      { id: "tpl_conservador_despesas", name: "Despesas", percent: 50 },
      { id: "tpl_conservador_lazer", name: "Lazer", percent: 10 },
      { id: "tpl_conservador_investimento", name: "Investimento", percent: 20 },
      { id: "tpl_conservador_poupanca", name: "Poupanca", percent: 20 },
    ],
  },
  {
    id: "equilibrado",
    name: "Equilibrado",
    categories: [
      { id: "tpl_equilibrado_despesas", name: "Despesas", percent: 60 },
      { id: "tpl_equilibrado_lazer", name: "Lazer", percent: 5 },
      { id: "tpl_equilibrado_investimento", name: "Investimento", percent: 15 },
      { id: "tpl_equilibrado_poupanca", name: "Poupanca", percent: 20 },
    ],
  },
  {
    id: "agressivo",
    name: "Agressivo",
    categories: [
      { id: "tpl_agressivo_despesas", name: "Despesas", percent: 70 },
      { id: "tpl_agressivo_lazer", name: "Lazer", percent: 10 },
      { id: "tpl_agressivo_investimento", name: "Investimento", percent: 15 },
      { id: "tpl_agressivo_poupanca", name: "Poupanca", percent: 5 },
    ],
  },
];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toBudgetDto(budget: {
  accountId: { toString(): string };
  month: string;
  totalBudget: number;
  categories: Array<{ id: string; name: string; percent: number }>;
}): MonthBudgetDto {
  const categories = budget.categories.map((c) => ({
    id: c.id,
    name: c.name,
    percent: c.percent,
  }));

  return {
    accountId: budget.accountId.toString(),
    month: budget.month,
    totalBudget: budget.totalBudget,
    categories,
    isReady: isBudgetReady(categories),
  };
}

export function validateBudgetPercentages(
  categories: Array<{ id: string; name: string; percent: number }>,
  tolerance = BUDGET_TOLERANCE,
): void {
  const total = categories.reduce((sum, c) => sum + c.percent, 0);
  if (Math.abs(total - 100) > tolerance) {
    unprocessable("Percentagens de orcamento devem totalizar 100%", "BUDGET_PERCENT_INVALID", {
      totalPercent: total.toFixed(2),
      expected: "100.00",
    });
  }

  const seen = new Set<string>();
  for (const category of categories) {
    if (seen.has(category.id)) {
      unprocessable("IDs de categoria duplicados", "DUPLICATE_CATEGORY_ID", {
        categoryId: category.id,
      });
    }
    seen.add(category.id);
  }
}

export function isBudgetReady(
  categories: Array<{ id: string; name: string; percent: number }>,
  tolerance = BUDGET_TOLERANCE,
): boolean {
  if (categories.length === 0) {
    return false;
  }

  const total = categories.reduce((sum, c) => sum + c.percent, 0);
  return Math.abs(total - 100) <= tolerance;
}

async function sumIncomeForMonth(accountId: string, month: string): Promise<number> {
  const incomes = await TransactionModel.find({
    accountId,
    month,
    type: "income",
  })
    .select({ amount: 1, _id: 0 })
    .lean();

  const totalIncome = incomes.reduce((sum, tx) => sum + tx.amount, 0);
  return roundCurrency(totalIncome);
}

async function syncBudgetTotal(accountId: string, month: string): Promise<number> {
  const totalBudget = await sumIncomeForMonth(accountId, month);

  await BudgetModel.updateOne(
    { accountId, month },
    {
      $set: {
        totalBudget,
      },
    },
  );

  return totalBudget;
}

function emptyBudget(accountId: string, month: string, totalBudget: number): MonthBudgetDto {
  return {
    accountId,
    month,
    totalBudget,
    categories: [],
    isReady: false,
  };
}

export function getBudgetTemplates(): BudgetTemplateDto[] {
  return BUDGET_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    categories: template.categories.map((category) => ({
      id: category.id,
      name: category.name,
      percent: category.percent,
    })),
  }));
}

export async function getBudget(accountId: string, month: string): Promise<MonthBudgetDto> {
  const budget = await BudgetModel.findOne({ accountId, month });
  const totalBudget = await sumIncomeForMonth(accountId, month);

  if (!budget) {
    return emptyBudget(accountId, month, totalBudget);
  }

  if (Math.abs(budget.totalBudget - totalBudget) > BUDGET_TOLERANCE) {
    budget.totalBudget = totalBudget;
    await budget.save();
  }

  return toBudgetDto(budget);
}

export async function saveBudget(
  accountId: string,
  month: string,
  input: { totalBudget: number; categories: BudgetCategoryDto[] },
  actorUserId: string,
): Promise<MonthBudgetDto> {
  validateBudgetPercentages(input.categories);

  const totalBudget = await sumIncomeForMonth(accountId, month);

  const updated = await BudgetModel.findOneAndUpdate(
    { accountId, month },
    {
      $set: {
        userId: actorUserId,
        totalBudget,
        categories: input.categories,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return toBudgetDto(updated);
}

export async function addCategory(
  accountId: string,
  month: string,
  input: { name: string; percent: number },
  actorUserId: string,
): Promise<MonthBudgetDto> {
  const budget =
    (await BudgetModel.findOne({ accountId, month })) ??
    (await BudgetModel.create({
      accountId,
      userId: actorUserId,
      month,
      totalBudget: 0,
      categories: [],
    }));

  budget.categories.push({
    id: newCategoryId(),
    name: input.name,
    percent: input.percent,
  });

  budget.userId = new Types.ObjectId(actorUserId);
  budget.totalBudget = await sumIncomeForMonth(accountId, month);
  await budget.save();
  return toBudgetDto(budget);
}

export async function removeCategory(
  accountId: string,
  month: string,
  categoryId: string,
  actorUserId: string,
): Promise<MonthBudgetDto> {
  const budget = await BudgetModel.findOne({ accountId, month });
  if (!budget) {
    const totalBudget = await sumIncomeForMonth(accountId, month);
    return emptyBudget(accountId, month, totalBudget);
  }

  budget.set(
    "categories",
    budget.categories.filter((c) => c.id !== categoryId),
  );
  budget.userId = new Types.ObjectId(actorUserId);
  budget.totalBudget = await sumIncomeForMonth(accountId, month);
  await budget.save();

  return toBudgetDto(budget);
}

export async function copyBudgetFromMonth(
  accountId: string,
  targetMonth: string,
  sourceMonth: string,
  actorUserId: string,
): Promise<MonthBudgetDto> {
  const source = await BudgetModel.findOne({ accountId, month: sourceMonth });
  if (!source) {
    notFound("Orcamento de origem nao encontrado", "SOURCE_BUDGET_NOT_FOUND");
  }

  const totalBudget = await sumIncomeForMonth(accountId, targetMonth);

  const updated = await BudgetModel.findOneAndUpdate(
    { accountId, month: targetMonth },
    {
      $set: {
        userId: actorUserId,
        totalBudget,
        categories: source.categories.map((c) => ({
          id: c.id,
          name: c.name,
          percent: c.percent,
        })),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return toBudgetDto(updated);
}

export async function syncBudgetTotalFromTransactions(accountId: string, month: string): Promise<void> {
  await syncBudgetTotal(accountId, month);
}
