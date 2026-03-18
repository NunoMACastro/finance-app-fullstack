import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("stats integration", () => {
  test("returns deterministic categorySeries without random values", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Stats User",
      email: "stats@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.tokens.accessToken as string;
    const month = monthKeyFromNow();

    const incomeCategoriesRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(incomeCategoriesRes.status).toBe(200);
    const defaultIncomeCategoryId = incomeCategoriesRes.body[0]?.id as string | undefined;
    expect(defaultIncomeCategoryId).toMatch(/^[a-fA-F0-9]{24}$/);

    const budgetRes = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        totalBudget: 0,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60, kind: "expense" },
          { id: "cat_lazer", name: "Lazer", percent: 40, kind: "reserve" },
        ],
      });

    expect(budgetRes.status).toBe(200);

    const incomeRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-05`,
        type: "income",
        origin: "manual",
        description: "Salario",
        amount: 2000,
        categoryId: defaultIncomeCategoryId,
      });

    expect(incomeRes.status).toBe(201);

    const expenseA = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-08`,
        type: "expense",
        origin: "manual",
        description: "Supermercado",
        amount: 500,
        categoryId: "cat_despesas",
      });

    const expenseB = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-10`,
        type: "expense",
        origin: "manual",
        description: "Cinema",
        amount: 120,
        categoryId: "cat_lazer",
      });

    expect(expenseA.status).toBe(201);
    expect(expenseB.status).toBe(201);

    const statsResA = await request(getIntegrationApp())
      .get("/api/v1/stats/semester")
      .set("Authorization", `Bearer ${accessToken}`);

    const statsResB = await request(getIntegrationApp())
      .get("/api/v1/stats/semester")
      .set("Authorization", `Bearer ${accessToken}`);
    const statsResForecastWindow = await request(getIntegrationApp())
      .get("/api/v1/stats/semester")
      .query({ forecastWindow: 6 })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(statsResA.status).toBe(200);
    expect(statsResB.status).toBe(200);
    expect(statsResForecastWindow.status).toBe(200);

    expect(statsResA.body.categorySeries).toEqual(statsResB.body.categorySeries);
    expect(statsResA.body.incomeByCategory).toEqual(statsResB.body.incomeByCategory);
    expect(statsResA.body.incomeCategorySeries).toEqual(statsResB.body.incomeCategorySeries);
    expect(Array.isArray(statsResA.body.categorySeries)).toBe(true);
    expect(statsResA.body.categorySeries.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(statsResA.body.incomeByCategory)).toBe(true);
    expect(Array.isArray(statsResA.body.incomeCategorySeries)).toBe(true);
    expect(statsResA.body.incomeByCategory.length).toBeGreaterThanOrEqual(1);
    expect(statsResA.body.totalsBreakdown).toMatchObject({
      consumption: 500,
      savings: 120,
      unallocated: 1380,
      potentialSavings: 1500,
      rates: {
        savings: 6,
        unallocated: 69,
        potentialSavings: 75,
      },
    });
    expect(statsResA.body.totals.totalExpense).toBeCloseTo(
      statsResA.body.totalsBreakdown.consumption + statsResA.body.totalsBreakdown.savings,
      2,
    );
    expect(statsResForecastWindow.body.forecast).toMatchObject({
      windowMonths: 6,
      sampleSize: 6,
      confidence: "high",
    });

    for (const series of statsResA.body.categorySeries as Array<{
      categoryId: string;
      categoryName: string;
      monthly: Array<{ month: string; budgeted: number; actual: number }>;
    }>) {
      expect(series.categoryId).toBeTypeOf("string");
      expect(series.categoryName).toBeTypeOf("string");
      expect(series.monthly.length).toBe(6);
      for (const point of series.monthly) {
        expect(point.month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
        expect(Number.isFinite(point.budgeted)).toBe(true);
        expect(Number.isFinite(point.actual)).toBe(true);
      }
    }

    for (const item of statsResA.body.incomeByCategory as Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      percent: number;
    }>) {
      expect(item.categoryId).toBeTypeOf("string");
      expect(item.categoryName).toBeTypeOf("string");
      expect(Number.isFinite(item.amount)).toBe(true);
      expect(Number.isFinite(item.percent)).toBe(true);
    }

    for (const series of statsResA.body.incomeCategorySeries as Array<{
      categoryId: string;
      categoryName: string;
      monthly: Array<{ month: string; amount: number }>;
    }>) {
      expect(series.categoryId).toBeTypeOf("string");
      expect(series.categoryName).toBeTypeOf("string");
      expect(series.monthly.length).toBe(6);
      for (const point of series.monthly) {
        expect(point.month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
        expect(Number.isFinite(point.amount)).toBe(true);
      }
    }
  });
});
