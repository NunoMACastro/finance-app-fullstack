import { describe, expect, test } from "vitest";
import { validateBudgetPercentages } from "../../modules/budgets/service.js";

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
});
