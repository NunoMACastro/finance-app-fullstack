import { BudgetModel } from "../../models/budget.model.js";
import { newCategoryId } from "../../lib/hash.js";
import { notFound, unprocessable } from "../../lib/api-error.js";

interface BudgetCategoryDto {
  id: string;
  name: string;
  percent: number;
}

interface MonthBudgetDto {
  userId: string;
  month: string;
  totalBudget: number;
  categories: BudgetCategoryDto[];
}

const BUDGET_TOLERANCE = 0.01;

function toBudgetDto(budget: {
  userId: { toString(): string };
  month: string;
  totalBudget: number;
  categories: Array<{ id: string; name: string; percent: number }>;
}): MonthBudgetDto {
  return {
    userId: budget.userId.toString(),
    month: budget.month,
    totalBudget: budget.totalBudget,
    categories: budget.categories.map((c) => ({
      id: c.id,
      name: c.name,
      percent: c.percent,
    })),
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

function emptyBudget(userId: string, month: string): MonthBudgetDto {
  return {
    userId,
    month,
    totalBudget: 0,
    categories: [],
  };
}

export async function getBudget(userId: string, month: string): Promise<MonthBudgetDto> {
  const budget = await BudgetModel.findOne({ userId, month });
  if (!budget) {
    return emptyBudget(userId, month);
  }
  return toBudgetDto(budget);
}

export async function saveBudget(
  userId: string,
  month: string,
  input: { totalBudget: number; categories: BudgetCategoryDto[] },
): Promise<MonthBudgetDto> {
  validateBudgetPercentages(input.categories);

  const updated = await BudgetModel.findOneAndUpdate(
    { userId, month },
    {
      $set: {
        totalBudget: input.totalBudget,
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
  userId: string,
  month: string,
  input: { name: string; percent: number },
): Promise<MonthBudgetDto> {
  const budget =
    (await BudgetModel.findOne({ userId, month })) ??
    (await BudgetModel.create({ userId, month, totalBudget: 0, categories: [] }));

  budget.categories.push({
    id: newCategoryId(),
    name: input.name,
    percent: input.percent,
  });

  await budget.save();
  return toBudgetDto(budget);
}

export async function removeCategory(
  userId: string,
  month: string,
  categoryId: string,
): Promise<MonthBudgetDto> {
  const budget = await BudgetModel.findOne({ userId, month });
  if (!budget) {
    return emptyBudget(userId, month);
  }

  budget.set(
    "categories",
    budget.categories.filter((c) => c.id !== categoryId),
  );
  await budget.save();

  return toBudgetDto(budget);
}

export async function copyBudgetFromMonth(
  userId: string,
  targetMonth: string,
  sourceMonth: string,
): Promise<MonthBudgetDto> {
  const source = await BudgetModel.findOne({ userId, month: sourceMonth });
  if (!source) {
    notFound("Orcamento de origem nao encontrado", "SOURCE_BUDGET_NOT_FOUND");
  }

  const updated = await BudgetModel.findOneAndUpdate(
    { userId, month: targetMonth },
    {
      $set: {
        totalBudget: source.totalBudget,
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
