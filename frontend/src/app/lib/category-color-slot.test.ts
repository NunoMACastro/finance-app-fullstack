import { describe, expect, test } from "vitest";
import {
  assignCategoryColorSlots,
  nextCategoryColorSlot,
  normalizeCategoryColorSlot,
  resolveCategoryColorSlot,
} from "./category-color-slot";

describe("category-color-slot", () => {
  test("normaliza slots validos e invalida valores fora do contrato", () => {
    expect(normalizeCategoryColorSlot(1)).toBe(1);
    expect(normalizeCategoryColorSlot(9)).toBe(9);
    expect(normalizeCategoryColorSlot(0)).toBeNull();
    expect(normalizeCategoryColorSlot(10)).toBeNull();
    expect(normalizeCategoryColorSlot(undefined)).toBeNull();
  });

  test("resolve slot mantendo o fornecido quando valido", () => {
    expect(resolveCategoryColorSlot({ id: "cat_a", colorSlot: 4 }, 0)).toBe(4);
  });

  test("atribui slots ausentes sem duplicar enquanto houver slots livres", () => {
    const normalized = assignCategoryColorSlots([
      { id: "cat_1", name: "A", percent: 50, colorSlot: 1 },
      { id: "cat_2", name: "B", percent: 50 },
      { id: "cat_3", name: "C", percent: 0, colorSlot: 1 },
    ]);

    const slots = normalized.map((item) => item.colorSlot);
    expect(slots[0]).toBe(1);
    expect(new Set(slots).size).toBe(slots.length);
  });

  test("calcula proximo slot com base nos que ja estao em uso", () => {
    const slot = nextCategoryColorSlot(
      [
        { id: "cat_1", colorSlot: 1 },
        { id: "cat_2", colorSlot: 2 },
      ],
      "cat_new",
    );
    expect(slot).toBeGreaterThanOrEqual(1);
    expect(slot).toBeLessThanOrEqual(9);
    expect([1, 2]).not.toContain(slot);
  });
});
