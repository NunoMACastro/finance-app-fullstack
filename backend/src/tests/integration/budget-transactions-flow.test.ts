import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("budget + transactions integration", () => {
  test("manual transactions require ready budget and budget total follows incomes", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Ana",
      email: "ana@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.tokens.accessToken;
    const month = monthKeyFromNow();

    const incomeCategoriesRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(incomeCategoriesRes.status).toBe(200);
    const defaultIncomeCategoryId = incomeCategoriesRes.body[0]?.id as string | undefined;
    expect(defaultIncomeCategoryId).toMatch(/^[a-fA-F0-9]{24}$/);

    const blockedRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-10`,
        type: "expense",
        origin: "manual",
        description: "Supermercado",
        amount: 30,
        categoryId: "cat_despesas",
      });

    expect(blockedRes.status).toBe(422);
    expect(blockedRes.body.code).toBe("BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS");

    const budgetRes = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        totalBudget: 99999,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 5 },
          { id: "cat_invest", name: "Investimento", percent: 15 },
          { id: "cat_poup", name: "Poupanca", percent: 20 },
        ],
      });

    expect(budgetRes.status).toBe(200);
    expect(budgetRes.body.isReady).toBe(true);
    expect(budgetRes.body.totalBudget).toBe(0);

    const incomeRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-10`,
        type: "income",
        origin: "manual",
        description: "Ordenado",
        amount: 1200,
        categoryId: defaultIncomeCategoryId,
      });

    expect(incomeRes.status).toBe(201);

    const budgetAfterIncome = await request(getIntegrationApp())
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(budgetAfterIncome.status).toBe(200);
    expect(budgetAfterIncome.body.totalBudget).toBe(1200);

    const deleteIncomeRes = await request(getIntegrationApp())
      .delete(`/api/v1/transactions/${incomeRes.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteIncomeRes.status).toBe(204);

    const budgetAfterDelete = await request(getIntegrationApp())
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(budgetAfterDelete.status).toBe(200);
    expect(budgetAfterDelete.body.totalBudget).toBe(0);
  });
});
