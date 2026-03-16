import type { BudgetCategory, BudgetCategoryKind } from "./types";

const RESERVE_CATEGORY_NAME_KEYS = new Set(["poupanca", "investimento"]);

function normalizeCategoryNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isBudgetCategoryKind(value?: string | null): value is BudgetCategoryKind {
  return value === "expense" || value === "reserve";
}

export function inferBudgetCategoryKind(name: string): BudgetCategoryKind {
  return RESERVE_CATEGORY_NAME_KEYS.has(normalizeCategoryNameKey(name)) ? "reserve" : "expense";
}

export function normalizeBudgetCategoryKind(kind: string | null | undefined, name: string): BudgetCategoryKind {
  if (isBudgetCategoryKind(kind)) return kind;
  return inferBudgetCategoryKind(name);
}

export function normalizeBudgetCategoriesKind(categories: BudgetCategory[]): BudgetCategory[] {
  return categories.map((category) => ({
    ...category,
    kind: normalizeBudgetCategoryKind(category.kind, category.name),
  }));
}

