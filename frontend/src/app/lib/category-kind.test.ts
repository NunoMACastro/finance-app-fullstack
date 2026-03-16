import { describe, expect, test } from "vitest";
import {
  inferBudgetCategoryKind,
  normalizeBudgetCategoriesKind,
  normalizeBudgetCategoryKind,
} from "./category-kind";

describe("category-kind", () => {
  test("infere reserve para categorias de reserva conhecidas", () => {
    expect(inferBudgetCategoryKind("Poupança")).toBe("reserve");
    expect(inferBudgetCategoryKind("Poupanca")).toBe("reserve");
    expect(inferBudgetCategoryKind("Investimento")).toBe("reserve");
  });

  test("infere expense por omissão", () => {
    expect(inferBudgetCategoryKind("Lazer")).toBe("expense");
  });

  test("preserva kind válido quando já definido", () => {
    expect(normalizeBudgetCategoryKind("reserve", "Despesas")).toBe("reserve");
    expect(normalizeBudgetCategoryKind("expense", "Investimento")).toBe("expense");
  });

  test("normaliza lista aplicando fallback por nome", () => {
    const categories = normalizeBudgetCategoriesKind([
      { id: "a", name: "Poupança", percent: 20 },
      { id: "b", name: "Despesas", percent: 80 },
    ]);

    expect(categories[0]?.kind).toBe("reserve");
    expect(categories[1]?.kind).toBe("expense");
  });
});

