import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("stats insight fallback integration", () => {
  test("returns stats successfully without insight when OpenAI key is missing", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Insight Fallback",
      email: "insight-fallback@example.com",
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
        categories: [{ id: "cat_despesas", name: "Despesas", percent: 100 }],
      });
    expect(budgetRes.status).toBe(200);

    const incomeRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-08`,
        type: "income",
        origin: "manual",
        description: "Salario",
        amount: 1800,
        categoryId: defaultIncomeCategoryId,
      });
    expect(incomeRes.status).toBe(201);

    const expenseRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-10`,
        type: "expense",
        origin: "manual",
        description: "Supermercado",
        amount: 420,
        categoryId: "cat_despesas",
      });
    expect(expenseRes.status).toBe(201);

    const statsRes = await request(getIntegrationApp())
      .get("/api/v1/stats/semester")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totals).toBeTruthy();
    expect(statsRes.body.forecast).toBeTruthy();
    expect(statsRes.body.insight).toBeUndefined();
  });
});
