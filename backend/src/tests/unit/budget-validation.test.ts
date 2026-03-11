import { describe, expect, test } from "vitest";
import {
  getBudgetTemplates,
  isBudgetReady,
  validateBudgetPercentages,
} from "../../modules/budgets/service.js";

describe("validateBudgetPercentages", () => {
  test("accepts exact 100%", () => {
    expect(() =>
      validateBudgetPercentages([
        { id: "cat1", name: "A", percent: 60 },
        { id: "cat2", name: "B", percent: 40 },
      ]),
    ).not.toThrow();
  });

  test("accepts within tolerance", () => {
    expect(() =>
      validateBudgetPercentages([
        { id: "cat1", name: "A", percent: 33.33 },
        { id: "cat2", name: "B", percent: 33.33 },
        { id: "cat3", name: "C", percent: 33.34 },
      ]),
    ).not.toThrow();
  });

  test("rejects when total is not 100%", () => {
    expect(() =>
      validateBudgetPercentages([
        { id: "cat1", name: "A", percent: 30 },
        { id: "cat2", name: "B", percent: 30 },
      ]),
    ).toThrowError(/100%/i);
  });

  test("isBudgetReady requires at least one category", () => {
    expect(isBudgetReady([])).toBe(false);
  });

  test("isBudgetReady requires 100%", () => {
    expect(
      isBudgetReady([
        { id: "cat1", name: "A", percent: 40 },
        { id: "cat2", name: "B", percent: 60 },
      ]),
    ).toBe(true);

    expect(
      isBudgetReady([
        { id: "cat1", name: "A", percent: 70 },
      ]),
    ).toBe(false);

    expect(
      isBudgetReady([
        { id: "cat1", name: "A", percent: 70 },
        { id: "cat2", name: "B", percent: 40 },
      ]),
    ).toBe(false);
  });

  test("all budget templates total 100%", () => {
    const templates = getBudgetTemplates();
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      const total = template.categories.reduce((sum, category) => sum + category.percent, 0);
      expect(total).toBe(100);
      expect(template.categories.length).toBe(4);
    }
  });
});
