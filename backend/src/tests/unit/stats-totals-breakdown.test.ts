import { describe, expect, test } from "vitest";
import { buildTotalsBreakdown } from "../../modules/stats/service.js";

describe("buildTotalsBreakdown", () => {
  test("splits totals between consumption and savings based on categoryKind", () => {
    const breakdown = buildTotalsBreakdown(
      {
        totalIncome: 3000,
        totalExpense: 2100,
        balance: 900,
      },
      [
        {
          categoryId: "c1",
          categoryName: "Casa",
          categoryKind: "expense",
          budgeted: 1400,
          actual: 1200,
          difference: 200,
        },
        {
          categoryId: "c2",
          categoryName: "Poupanca",
          categoryKind: "reserve",
          budgeted: 800,
          actual: 700,
          difference: 100,
        },
        {
          categoryId: "c3",
          categoryName: "Outros",
          budgeted: 400,
          actual: 200,
          difference: 200,
        },
      ],
    );

    expect(breakdown).toEqual({
      consumption: 1400,
      savings: 700,
      unallocated: 900,
      potentialSavings: 1600,
      rates: {
        savings: 23.33,
        unallocated: 30,
        potentialSavings: 53.33,
      },
    });
  });

  test("returns zero rates when totalIncome is zero", () => {
    const breakdown = buildTotalsBreakdown(
      {
        totalIncome: 0,
        totalExpense: 250,
        balance: -250,
      },
      [
        {
          categoryId: "c1",
          categoryName: "Despesas",
          categoryKind: "expense",
          budgeted: 0,
          actual: 250,
          difference: -250,
        },
      ],
    );

    expect(breakdown).toEqual({
      consumption: 250,
      savings: 0,
      unallocated: -250,
      potentialSavings: 0,
      rates: {
        savings: 0,
        unallocated: 0,
        potentialSavings: 0,
      },
    });
  });
});
