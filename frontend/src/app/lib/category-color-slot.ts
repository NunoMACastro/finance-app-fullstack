import type { BudgetCategory } from "./types";

const CATEGORY_COLOR_MIN = 1;
const CATEGORY_COLOR_MAX = 9;
const CATEGORY_COLOR_COUNT = CATEGORY_COLOR_MAX - CATEGORY_COLOR_MIN + 1;

export function normalizeCategoryColorSlot(colorSlot?: number): number | null {
  if (!Number.isInteger(colorSlot)) return null;
  if ((colorSlot as number) < CATEGORY_COLOR_MIN || (colorSlot as number) > CATEGORY_COLOR_MAX) return null;
  return colorSlot as number;
}

export function hashCategoryIdToColorSlot(categoryId: string): number {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return (hash % CATEGORY_COLOR_COUNT) + CATEGORY_COLOR_MIN;
}

export function resolveCategoryColorSlot(category: Pick<BudgetCategory, "id" | "colorSlot">, fallbackIndex = 0): number {
  const normalized = normalizeCategoryColorSlot(category.colorSlot);
  if (normalized) return normalized;
  if (category.id) return hashCategoryIdToColorSlot(category.id);
  return ((fallbackIndex % CATEGORY_COLOR_COUNT) + CATEGORY_COLOR_MIN);
}

export function assignCategoryColorSlots(categories: BudgetCategory[]): BudgetCategory[] {
  const usedSlots = new Set<number>();
  const normalized = categories.map((category) => ({ ...category, colorSlot: 0 }));

  normalized.forEach((category, index) => {
    const slot = normalizeCategoryColorSlot(categories[index]?.colorSlot);
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

export function nextCategoryColorSlot(
  existingCategories: Pick<BudgetCategory, "id" | "colorSlot">[],
  categoryId: string,
): number {
  const usedSlots = new Set<number>();
  for (const category of existingCategories) {
    const slot = normalizeCategoryColorSlot(category.colorSlot);
    if (slot) usedSlots.add(slot);
  }

  let slot = hashCategoryIdToColorSlot(categoryId);
  if (usedSlots.size < CATEGORY_COLOR_COUNT) {
    while (usedSlots.has(slot)) {
      slot = slot === CATEGORY_COLOR_MAX ? CATEGORY_COLOR_MIN : slot + 1;
    }
  }
  return slot;
}
