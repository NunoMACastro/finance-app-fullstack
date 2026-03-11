import { describe, expect, test } from "vitest";
import { buildForecast } from "../../modules/stats/service.js";

describe("buildForecast", () => {
  test("returns zero forecast for empty trend", () => {
    expect(buildForecast([])).toEqual({
      projectedIncome: 0,
      projectedExpense: 0,
      projectedBalance: 0,
    });
  });

  test("uses moving average of last 3 months", () => {
    const forecast = buildForecast([
      { month: "2025-11", income: 1000, expense: 700, balance: 300 },
      { month: "2025-12", income: 1200, expense: 900, balance: 300 },
      { month: "2026-01", income: 1300, expense: 800, balance: 500 },
      { month: "2026-02", income: 1100, expense: 850, balance: 250 },
    ]);

    expect(forecast).toEqual({
      projectedIncome: 1200,
      projectedExpense: 850,
      projectedBalance: 350,
    });
  });
});
