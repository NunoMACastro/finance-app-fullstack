import { describe, expect, test } from "vitest";
import type { StatsSnapshot } from "../lib/types";
import { buildStatsViewModel } from "./stats-view-model";

function buildSnapshot(overrides?: Partial<StatsSnapshot>): StatsSnapshot {
  return {
    periodType: "semester",
    periodKey: "2026-S1",
    totals: {
      totalIncome: 5000,
      totalExpense: 2900,
      balance: 2100,
    },
    trend: [
      { month: "2026-01", income: 2500, expense: 1300, balance: 1200 },
      { month: "2026-02", income: 2500, expense: 1600, balance: 900 },
    ],
    budgetVsActual: [
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
        actual: 600,
        difference: 200,
      },
      {
        categoryId: "c3",
        categoryName: "Lazer",
        budgeted: 1300,
        actual: 1100,
        difference: 200,
      },
    ],
    categorySeries: [],
    incomeByCategory: [],
    incomeCategorySeries: [],
    forecast: {
      projectedIncome: 2500,
      projectedExpense: 1450,
      projectedBalance: 1050,
      windowMonths: 3,
      sampleSize: 2,
      confidence: "medium",
    },
    ...overrides,
  };
}

describe("buildStatsViewModel totals breakdown", () => {
  test("uses snapshot.totalsBreakdown when provided", () => {
    const snapshot = buildSnapshot({
      totalsBreakdown: {
        consumption: 1900,
        savings: 700,
        unallocated: 2400,
        potentialSavings: 3100,
        rates: {
          savings: 14,
          unallocated: 48,
          potentialSavings: 62,
        },
      },
    });

    const model = buildStatsViewModel(snapshot);

    expect(model.consumption).toBe(1900);
    expect(model.savings).toBe(700);
    expect(model.unallocated).toBe(2400);
    expect(model.potentialSavings).toBe(3100);
    expect(model.savingsRate).toBe(14);
    expect(model.unallocatedRate).toBe(48);
    expect(model.potentialSavingsRate).toBe(62);
    expect(model.budgetDriftAbs).toBe(600);
    expect(model.budgetAdherenceRate).toBeCloseTo(82.86, 2);
  });

  test("falls back to deterministic local breakdown when totalsBreakdown is absent", () => {
    const snapshot = buildSnapshot();
    const model = buildStatsViewModel(snapshot);

    expect(model.consumption).toBe(2300);
    expect(model.savings).toBe(600);
    expect(model.unallocated).toBe(2100);
    expect(model.potentialSavings).toBe(2700);
    expect(model.savingsRate).toBe(12);
    expect(model.unallocatedRate).toBe(42);
    expect(model.potentialSavingsRate).toBe(54);
    expect(model.budgetDriftAbs).toBe(600);
    expect(model.budgetAdherenceRate).toBeCloseTo(82.86, 2);
  });
});
