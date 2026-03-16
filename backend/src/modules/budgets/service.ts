import { BudgetModel } from "../../models/budget.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { newCategoryId } from "../../lib/hash.js";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { Types } from "mongoose";

export type BudgetCategoryKind = "expense" | "reserve";

interface BudgetCategoryInput {
  id: string;
  name: string;
  percent: number;
  colorSlot?: number | null;
  kind?: BudgetCategoryKind | null;
}

interface BudgetCategoryDto {
  id: string;
  name: string;
  percent: number;
  colorSlot: number;
  kind: BudgetCategoryKind;
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
const CATEGORY_COLOR_MIN = 1;
const CATEGORY_COLOR_MAX = 9;
const CATEGORY_COLOR_COUNT = CATEGORY_COLOR_MAX - CATEGORY_COLOR_MIN + 1;
const RESERVE_CATEGORY_NAME_KEYS = new Set(["poupanca", "investimento"]);

const BUDGET_TEMPLATES: BudgetTemplateDto[] = [
  {
    id: "conservador",
    name: "Conservador",
    categories: [
      { id: "tpl_conservador_despesas", name: "Despesas", percent: 50, colorSlot: 1, kind: "expense" },
      { id: "tpl_conservador_lazer", name: "Lazer", percent: 10, colorSlot: 2, kind: "expense" },
      { id: "tpl_conservador_investimento", name: "Investimento", percent: 20, colorSlot: 3, kind: "reserve" },
      { id: "tpl_conservador_poupanca", name: "Poupança", percent: 20, colorSlot: 4, kind: "reserve" },
    ],
  },
  {
    id: "equilibrado",
    name: "Equilibrado",
    categories: [
      { id: "tpl_equilibrado_despesas", name: "Despesas", percent: 60, colorSlot: 1, kind: "expense" },
      { id: "tpl_equilibrado_lazer", name: "Lazer", percent: 5, colorSlot: 2, kind: "expense" },
      { id: "tpl_equilibrado_investimento", name: "Investimento", percent: 15, colorSlot: 3, kind: "reserve" },
      { id: "tpl_equilibrado_poupanca", name: "Poupança", percent: 20, colorSlot: 4, kind: "reserve" },
    ],
  },
  {
    id: "agressivo",
    name: "Agressivo",
    categories: [
      { id: "tpl_agressivo_despesas", name: "Despesas", percent: 70, colorSlot: 1, kind: "expense" },
      { id: "tpl_agressivo_lazer", name: "Lazer", percent: 10, colorSlot: 2, kind: "expense" },
      { id: "tpl_agressivo_investimento", name: "Investimento", percent: 15, colorSlot: 3, kind: "reserve" },
      { id: "tpl_agressivo_poupanca", name: "Poupança", percent: 5, colorSlot: 4, kind: "reserve" },
    ],
  },
];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeColorSlot(colorSlot?: number | null): number | null {
  if (!Number.isInteger(colorSlot)) return null;
  if ((colorSlot as number) < CATEGORY_COLOR_MIN || (colorSlot as number) > CATEGORY_COLOR_MAX) return null;
  return colorSlot as number;
}

function normalizeCategoryNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isBudgetCategoryKind(value?: string | null): value is BudgetCategoryKind {
  return value === "expense" || value === "reserve";
}

function inferCategoryKindByName(name: string): BudgetCategoryKind {
  return RESERVE_CATEGORY_NAME_KEYS.has(normalizeCategoryNameKey(name)) ? "reserve" : "expense";
}

export function normalizeCategoryKind(kind: string | null | undefined, name: string): BudgetCategoryKind {
  if (isBudgetCategoryKind(kind)) return kind;
  return inferCategoryKindByName(name);
}

function hashCategoryIdToColorSlot(categoryId: string): number {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return (hash % CATEGORY_COLOR_COUNT) + CATEGORY_COLOR_MIN;
}

export function assignCategoryColorSlots(categories: BudgetCategoryInput[]): BudgetCategoryDto[] {
  const usedSlots = new Set<number>();
  const normalized = categories.map((category) => ({
    id: category.id,
    name: category.name,
    percent: category.percent,
    colorSlot: 0,
    kind: normalizeCategoryKind(category.kind, category.name),
  }));

  normalized.forEach((category, index) => {
    const slot = normalizeColorSlot(categories[index]?.colorSlot);
    if (!slot || usedSlots.has(slot)) return;
    category.colorSlot = slot;
    usedSlots.add(slot);
  });

  normalized.forEach((category) => {
    if (category.colorSlot !== 0) return;
    let slot = hashCategoryIdToColorSlot(category.id);
    if (usedSlots.size < CATEGORY_COLOR_COUNT) {
      while (usedSlots.has(slot)) {
        slot = slot === CATEGORY_COLOR_MAX ? CATEGORY_COLOR_MIN : slot + 1;
      }
    }
    category.colorSlot = slot;
    usedSlots.add(slot);
  });

  return normalized;
}

function hasCategoryMetadataDrift(
  categories: Array<{ id: string; name: string; percent: number; colorSlot?: number | null; kind?: string | null }>,
  normalized: BudgetCategoryDto[],
): boolean {
  if (categories.length !== normalized.length) return true;
  return categories.some((category, index) => {
    const next = normalized[index];
    if (!next) return true;
    if (category.id !== next.id || category.name !== next.name || category.percent !== next.percent) return true;
    const colorSlot = normalizeColorSlot(category.colorSlot);
    if (!colorSlot || colorSlot !== next.colorSlot) return true;
    return !isBudgetCategoryKind(category.kind);
  });
}

function toBudgetDto(budget: {
  accountId: { toString(): string };
  month: string;
  totalBudget: number;
  categories: Array<{ id: string; name: string; percent: number; colorSlot?: number | null; kind?: string | null }>;
}): MonthBudgetDto {
  const categories = assignCategoryColorSlots(
    budget.categories.map((c) => ({
      id: c.id,
      name: c.name,
      percent: c.percent,
      colorSlot: c.colorSlot,
      kind: normalizeCategoryKind(c.kind, c.name),
    })),
  );

  return {
    accountId: budget.accountId.toString(),
    month: budget.month,
    totalBudget: budget.totalBudget,
    categories,
    isReady: isBudgetReady(categories),
  };
}

export function validateBudgetPercentages(
  categories: Array<{ id: string; name: string; percent: number; colorSlot?: number | null; kind?: string | null }>,
  tolerance = BUDGET_TOLERANCE,
): void {
  const total = categories.reduce((sum, c) => sum + c.percent, 0);
  if (Math.abs(total - 100) > tolerance) {
    unprocessable("Percentagens de orçamento devem totalizar 100%", "BUDGET_PERCENT_INVALID", {
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
  categories: Array<{ id: string; name: string; percent: number; colorSlot?: number | null; kind?: string | null }>,
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
      colorSlot: category.colorSlot,
      kind: normalizeCategoryKind(category.kind, category.name),
    })),
  }));
}

export async function getBudget(accountId: string, month: string): Promise<MonthBudgetDto> {
  const budget = await BudgetModel.findOne({ accountId, month });
  const totalBudget = await sumIncomeForMonth(accountId, month);

  if (!budget) {
    return emptyBudget(accountId, month, totalBudget);
  }

  const normalizedCategories = assignCategoryColorSlots(
    budget.categories.map((category) => ({
      id: category.id,
      name: category.name,
      percent: category.percent,
      colorSlot: category.colorSlot,
      kind: normalizeCategoryKind(category.kind, category.name),
    })),
  );
  const shouldPersistCategoryMetadata = hasCategoryMetadataDrift(budget.categories, normalizedCategories);
  const shouldSyncTotal = Math.abs(budget.totalBudget - totalBudget) > BUDGET_TOLERANCE;

  if (shouldSyncTotal) {
    budget.totalBudget = totalBudget;
  }
  if (shouldPersistCategoryMetadata) {
    budget.set("categories", normalizedCategories);
  }
  if (shouldSyncTotal || shouldPersistCategoryMetadata) {
    await budget.save();
  }

  return {
    accountId: budget.accountId.toString(),
    month: budget.month,
    totalBudget: budget.totalBudget,
    categories: normalizedCategories,
    isReady: isBudgetReady(normalizedCategories),
  };
}

export async function saveBudget(
  accountId: string,
  month: string,
  input: { totalBudget: number; categories: BudgetCategoryInput[] },
  actorUserId: string,
): Promise<MonthBudgetDto> {
  const categoriesWithSlots = assignCategoryColorSlots(input.categories);
  validateBudgetPercentages(categoriesWithSlots);

  const totalBudget = await sumIncomeForMonth(accountId, month);

  const updated = await BudgetModel.findOneAndUpdate(
    { accountId, month },
    {
      $set: {
        userId: actorUserId,
        totalBudget,
        categories: categoriesWithSlots,
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
  input: { name: string; percent: number; kind?: BudgetCategoryKind | null },
  actorUserId: string,
): Promise<MonthBudgetDto> {
  const categoryId = newCategoryId();
  const budget =
    (await BudgetModel.findOne({ accountId, month })) ??
    (await BudgetModel.create({
      accountId,
      userId: actorUserId,
      month,
      totalBudget: 0,
      categories: [],
    }));
  const existingCategories: BudgetCategoryInput[] = budget.categories.map((category) => ({
    id: category.id,
    name: category.name,
    percent: category.percent,
    colorSlot: category.colorSlot,
    kind: normalizeCategoryKind(category.kind, category.name),
  }));
  const categoriesWithSlots = assignCategoryColorSlots([
    ...existingCategories,
    {
      id: categoryId,
      name: input.name,
      percent: input.percent,
      kind: input.kind,
    },
  ]);
  budget.set("categories", categoriesWithSlots);

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

  const categoriesWithSlots = assignCategoryColorSlots(
    budget.categories
      .filter((c) => c.id !== categoryId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        percent: category.percent,
        colorSlot: category.colorSlot,
        kind: normalizeCategoryKind(category.kind, category.name),
      })),
  );
  budget.set("categories", categoriesWithSlots);
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
    notFound("Orçamento de origem não encontrado", "SOURCE_BUDGET_NOT_FOUND");
  }

  const totalBudget = await sumIncomeForMonth(accountId, targetMonth);

  const updated = await BudgetModel.findOneAndUpdate(
    { accountId, month: targetMonth },
    {
      $set: {
        userId: actorUserId,
        totalBudget,
        categories: assignCategoryColorSlots(
          source.categories.map((c) => ({
            id: c.id,
            name: c.name,
            percent: c.percent,
            colorSlot: c.colorSlot,
            kind: normalizeCategoryKind(c.kind, c.name),
          })),
        ),
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
