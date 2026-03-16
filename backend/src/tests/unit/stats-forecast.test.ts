import { describe, expect, test } from "vitest";
import { buildForecast } from "../../modules/stats/service.js";

describe("buildForecast", () => {
  test("returns zero forecast for empty trend", () => {
    expect(buildForecast([])).toEqual({
      projectedIncome: 0,
      projectedExpense: 0,
      projectedBalance: 0,
      windowMonths: 3,
      sampleSize: 0,
      confidence: "low",
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
      windowMonths: 3,
      sampleSize: 3,
      confidence: "high",
    });
  });

  test("supports moving average window of 6 months", () => {
    const forecast = buildForecast(
      [
        { month: "2025-09", income: 900, expense: 600, balance: 300 },
        { month: "2025-10", income: 1000, expense: 650, balance: 350 },
        { month: "2025-11", income: 1100, expense: 700, balance: 400 },
        { month: "2025-12", income: 1200, expense: 750, balance: 450 },
        { month: "2026-01", income: 1300, expense: 800, balance: 500 },
        { month: "2026-02", income: 1400, expense: 850, balance: 550 },
      ],
      6,
    );

    expect(forecast).toEqual({
      projectedIncome: 1150,
      projectedExpense: 725,
      projectedBalance: 425,
      windowMonths: 6,
      sampleSize: 6,
      confidence: "high",
    });
  });

  test("marks confidence as medium when window is 6 and only 3 samples are available", () => {
    const forecast = buildForecast(
      [
        { month: "2025-12", income: 1200, expense: 700, balance: 500 },
        { month: "2026-01", income: 1300, expense: 800, balance: 500 },
        { month: "2026-02", income: 1400, expense: 900, balance: 500 },
      ],
      6,
    );

    expect(forecast).toEqual({
      projectedIncome: 1300,
      projectedExpense: 800,
      projectedBalance: 500,
      windowMonths: 6,
      sampleSize: 3,
      confidence: "medium",
    });
  });
});
